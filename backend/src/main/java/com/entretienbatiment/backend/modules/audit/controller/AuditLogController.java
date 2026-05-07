package com.entretienbatiment.backend.modules.audit.controller;

import com.entretienbatiment.backend.modules.audit.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/developper/audit")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('DEVELOPPER')")
    public AuditLogService.AuditStatsResponse getStats(
            @RequestParam(defaultValue = "7") int range
    ) {
        return auditLogService.getStats(range);
    }

    @GetMapping("/logs")
    @PreAuthorize("hasRole('DEVELOPPER')")
    public Page<AuditLogService.AuditLogResponse> getLogs(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false)    Long userId,
            @RequestParam(required = false)    String action,
            @RequestParam(required = false)    Instant from,
            @RequestParam(required = false)    Instant to
    ) {
        return auditLogService.getLogs(page, size, userId, action, from, to);
    }

    @GetMapping("/user-stats")
    @PreAuthorize("hasRole('DEVELOPPER')")
    public List<AuditLogService.AuditUserStatResponse> getUserStats(
            @RequestParam(defaultValue = "30") int range
    ) {
        return auditLogService.getUserStats(range);
    }

    @GetMapping("/action-breakdown")
    @PreAuthorize("hasRole('DEVELOPPER')")
    public List<AuditLogService.AuditActionEntry> getActionBreakdown(
            @RequestParam(defaultValue = "30") int range
    ) {
        return auditLogService.getActionBreakdown(range);
    }

    @GetMapping("/timeline")
    @PreAuthorize("hasRole('DEVELOPPER')")
    public List<AuditLogService.AuditTimelineEntry> getTimeline(
            @RequestParam(defaultValue = "30") int range
    ) {
        return auditLogService.getTimeline(range);
    }

    /**
     * Accepts frontend-originated tracking events (page views, button clicks, etc.).
     * Accessible to every authenticated user so all roles can submit events.
     */
    @PostMapping("/track")
    @PreAuthorize("isAuthenticated()")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void track(
            @RequestBody TrackRequest req,
            HttpServletRequest request
    ) {
        auditLogService.log(
                req.action(),
                req.entityType(), req.entityId(), req.entityTitle(),
                req.details(),
                request
        );
    }

    public record TrackRequest(
            String action,
            String entityType,
            Long entityId,
            String entityTitle,
            String details
    ) {}
}
