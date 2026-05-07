package com.entretienbatiment.backend.modules.audit.service;

import com.entretienbatiment.backend.modules.audit.model.AuditLog;
import com.entretienbatiment.backend.modules.audit.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigInteger;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class AuditLogService {

    private final AuditLogRepository repo;

    public AuditLogService(AuditLogRepository repo) {
        this.repo = repo;
    }

    // ─── Logging (fire-and-forget, isolated transactions) ─────────────────────

    /**
     * Log using the current SecurityContext user. Safe to call from any
     * controller — all exceptions are swallowed so audit failures never
     * break the main request.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String action,
                    String entityType, Long entityId, String entityTitle,
                    String details,
                    HttpServletRequest request) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            Long userId = null;
            String email = null;
            String role = null;
            if (auth != null && auth.isAuthenticated()) {
                Object principal = auth.getPrincipal();
                email = (principal != null) ? principal.toString() : null;
                // Strip the "ROLE_" prefix; ignore the synthetic ROLE_ADMIN given to DEVELOPPERs
                role = auth.getAuthorities().stream()
                        .map(a -> a.getAuthority())
                        .filter(a -> a.startsWith("ROLE_") && !a.equals("ROLE_ADMIN"))
                        .findFirst()
                        .map(a -> a.substring(5))
                        .orElse(null);
                Object det = auth.getDetails();
                if (det != null) {
                    try { userId = Long.parseLong(det.toString()); } catch (NumberFormatException ignored) {}
                }
            }
            persist(action, userId, email, role, entityType, entityId, entityTitle, details, extractIp(request));
        } catch (Exception ignored) {
            // Audit failures must never break the main request
        }
    }

    /**
     * Log with an explicitly supplied user (e.g. at login time before the
     * SecurityContext is populated).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logWithUser(String action,
                            Long userId, String email, String role,
                            String entityType, Long entityId, String entityTitle,
                            String details,
                            HttpServletRequest request) {
        try {
            persist(action, userId, email, role, entityType, entityId, entityTitle, details, extractIp(request));
        } catch (Exception ignored) {}
    }

    private void persist(String action,
                         Long userId, String email, String role,
                         String entityType, Long entityId, String entityTitle,
                         String details, String ipAddress) {
        AuditLog log = new AuditLog();
        log.setId(UUID.randomUUID());
        log.setAction(action);
        log.setUserId(userId);
        log.setUserEmail(email);
        log.setUserRole(role);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setEntityTitle(entityTitle);
        log.setDetails(details);
        log.setIpAddress(ipAddress);
        log.setOccurredAt(Instant.now());
        repo.save(log);
    }

    private String extractIp(HttpServletRequest request) {
        if (request == null) return null;
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        return request.getRemoteAddr();
    }

    // ─── Query methods ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AuditStatsResponse getStats(int rangeDays) {
        Instant from     = rangeStart(rangeDays);
        Instant today    = Instant.now().truncatedTo(ChronoUnit.DAYS);

        long totalAll        = repo.count();
        long totalInRange    = repo.countByOccurredAtAfter(from);
        long uniqueUsers     = repo.countDistinctUserIdByOccurredAtAfter(from);
        long loginsInRange   = repo.countByActionAndOccurredAtAfter("LOGIN",  from);
        long logoutsInRange  = repo.countByActionAndOccurredAtAfter("LOGOUT", from);
        long woCreated       = repo.countByActionAndOccurredAtAfter("CREATE_WORK_ORDER",         from);
        long uwoCreated      = repo.countByActionAndOccurredAtAfter("CREATE_URGENT_WORK_ORDER",  from);
        long eventsToday     = repo.countByOccurredAtAfter(today);

        List<Object[]> actionCounts = repo.findActionCountsAfter(from);
        String mostCommonAction = actionCounts.isEmpty() ? null : (String) actionCounts.get(0)[0];

        List<Object[]> userStats = repo.findUserStatsAfter(from);
        String mostActiveUserEmail = userStats.isEmpty() ? null : (String) userStats.get(0)[1];

        return new AuditStatsResponse(
                totalAll, totalInRange, uniqueUsers,
                loginsInRange, logoutsInRange,
                woCreated, uwoCreated,
                eventsToday, mostCommonAction, mostActiveUserEmail, rangeDays
        );
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getLogs(int page, int size, Long userId,
                                          String action, Instant from, Instant to) {
        int safeSize = Math.min(Math.max(size, 1), 200);
        PageRequest pr = PageRequest.of(page, safeSize, Sort.by("occurredAt").descending());
        return repo.findFiltered(userId, action, from, to, pr).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<AuditUserStatResponse> getUserStats(int rangeDays) {
        Instant from = rangeStart(rangeDays);
        List<Object[]> rows = repo.findUserStatsAfter(from);
        List<AuditUserStatResponse> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(new AuditUserStatResponse(
                    toLong(row[0]),
                    (String) row[1],
                    (String) row[2],
                    toLong(row[3]),
                    toLong(row[4]),
                    toLong(row[5]),
                    toLong(row[6]),
                    toLong(row[7]),
                    toInstant(row[8])
            ));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<AuditActionEntry> getActionBreakdown(int rangeDays) {
        Instant from = rangeStart(rangeDays);
        return repo.findActionCountsAfter(from)
                .stream()
                .map(r -> new AuditActionEntry((String) r[0], toLong(r[1])))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AuditTimelineEntry> getTimeline(int rangeDays) {
        Instant from = rangeStart(rangeDays);
        return repo.findTimelineAfter(from)
                .stream()
                .map(r -> new AuditTimelineEntry(r[0].toString(), toLong(r[1])))
                .toList();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Instant rangeStart(int days) {
        if (days <= 0) return Instant.EPOCH;
        return Instant.now().minus(days, ChronoUnit.DAYS);
    }

    private long toLong(Object val) {
        if (val == null) return 0L;
        if (val instanceof Long l)       return l;
        if (val instanceof Integer i)    return i.longValue();
        if (val instanceof BigInteger bi) return bi.longValue();
        if (val instanceof Number n)     return n.longValue();
        return 0L;
    }

    private Instant toInstant(Object val) {
        if (val == null) return null;
        if (val instanceof java.sql.Timestamp ts)          return ts.toInstant();
        if (val instanceof java.time.OffsetDateTime odt)   return odt.toInstant();
        return null;
    }

    private AuditLogResponse toResponse(AuditLog l) {
        return new AuditLogResponse(
                l.getId().toString(), l.getUserId(), l.getUserEmail(), l.getUserRole(),
                l.getAction(), l.getEntityType(), l.getEntityId(), l.getEntityTitle(),
                l.getDetails(), l.getIpAddress(), l.getOccurredAt()
        );
    }

    // ─── Response records ─────────────────────────────────────────────────────

    public record AuditStatsResponse(
            long totalAll,
            long totalInRange,
            long uniqueUsers,
            long loginsInRange,
            long logoutsInRange,
            long workOrdersCreatedInRange,
            long urgentWorkOrdersCreatedInRange,
            long eventsToday,
            String mostCommonAction,
            String mostActiveUserEmail,
            int rangeDays
    ) {}

    public record AuditLogResponse(
            String id,
            Long userId,
            String userEmail,
            String userRole,
            String action,
            String entityType,
            Long entityId,
            String entityTitle,
            String details,
            String ipAddress,
            Instant occurredAt
    ) {}

    public record AuditUserStatResponse(
            Long userId,
            String userEmail,
            String userRole,
            long totalActions,
            long loginCount,
            long logoutCount,
            long workOrdersCreated,
            long urgentWorkOrdersCreated,
            Instant lastSeen
    ) {}

    public record AuditActionEntry(String action, long count) {}

    public record AuditTimelineEntry(String date, long count) {}
}
