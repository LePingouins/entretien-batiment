package com.entretienbatiment.backend.bugreport;

import com.entretienbatiment.backend.auth.AppUser;
import com.entretienbatiment.backend.auth.AppUserRepository;
import com.entretienbatiment.backend.auth.Role;
import com.entretienbatiment.backend.notifications.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
@Transactional
public class BugReportService {

    private static final Duration SUBMISSION_COOLDOWN = Duration.ofMinutes(30);

    private final BugReportFeatureRepository bugReportRepository;
    private final AppUserRepository userRepository;
    private final NotificationService notificationService;

    public BugReportService(
            BugReportFeatureRepository bugReportRepository,
            AppUserRepository userRepository,
            NotificationService notificationService
    ) {
        this.bugReportRepository = bugReportRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    public BugReportCreatedDto submitReport(Long reporterUserId, String rawTitle, String rawDescription) {
        AppUser reporter = requireEnabledUser(reporterUserId);

        String title = normalizeTitle(rawTitle);
        String description = normalizeDescription(rawDescription);

        enforceCooldown(reporterUserId);

        BugReportFeature report = new BugReportFeature();
        report.setReporterUserId(reporterUserId);
        report.setTitle(title);
        report.setDescription(description);
        BugReportFeature saved = bugReportRepository.save(report);

        String threadMessage = buildBugReportThreadMessage(saved, reporter.getEmail(), null);

        notificationService.notifyAdmins(
                "Bug Report / Feature Request",
            threadMessage,
            null,
                "bug-report-feature",
                saved.getId()
        );

        if (reporter.getRole() == null || !reporter.getRole().isAdminLike()) {
            notificationService.notifyUser(
                reporter.getId(),
                "Bug Report / Feature Request",
                threadMessage,
                null,
                "bug-report-feature",
                saved.getId()
            );
        }

        Instant createdAt = saved.getCreatedAt() != null ? saved.getCreatedAt() : Instant.now();
        return new BugReportCreatedDto(saved.getId(), createdAt, createdAt.plus(SUBMISSION_COOLDOWN));
    }

    public BugReportConfirmDto confirmReport(Long reportId, Long adminUserId) {
        AppUser admin = requireEnabledUser(adminUserId);

        if (admin.getRole() == null || !admin.getRole().isAdminLike()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }

        BugReportFeature report = requireReport(reportId);

        if (report.getConfirmedAt() != null) {
            String confirmerEmail = resolveConfirmerEmail(report.getConfirmedByUserId(), admin.getEmail());
            String reporterEmail = resolveReporterEmail(report.getReporterUserId());
            String confirmedThreadMessage = buildBugReportThreadMessage(report, reporterEmail, confirmerEmail);
            notificationService.refreshBugReportFeatureThread(
                report.getId(),
                "Bug Report / Feature Request",
                confirmedThreadMessage,
                null
            );

            return new BugReportConfirmDto(
                    report.getId(),
                    report.getConfirmedAt(),
                    confirmerEmail,
                    report.getReporterUserId(),
                report.getTitle(),
                true
            );
        }

        Instant now = Instant.now();
        report.setConfirmedAt(now);
        report.setConfirmedByUserId(adminUserId);
        bugReportRepository.save(report);

        String reporterEmail = resolveReporterEmail(report.getReporterUserId());
        String confirmedThreadMessage = buildBugReportThreadMessage(report, reporterEmail, admin.getEmail());
        notificationService.refreshBugReportFeatureThread(
            report.getId(),
            "Bug Report / Feature Request",
            confirmedThreadMessage,
            null
        );

        // Removed redundant notifyUser call to prevent duplicate notifications for the reporter.

        return new BugReportConfirmDto(
                report.getId(),
                now,
                admin.getEmail(),
                report.getReporterUserId(),
                report.getTitle(),
                false
        );
    }

    public void markReportAsRead(Long reportId, Long actorUserId) {
        AppUser actor = requireEnabledUser(actorUserId);
        BugReportFeature report = requireReport(reportId);
        if (!canManageReport(actor, report, actorUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }

        notificationService.markBugReportAsRead(actorUserId, reportId);
    }

    public void deleteReportForUser(Long reportId, Long actorUserId) {
        AppUser actor = requireEnabledUser(actorUserId);
        BugReportFeature report = requireReport(reportId);

        boolean actorIsAdmin = actor.getRole() != null && actor.getRole().isAdminLike();
        boolean actorIsReporter = Objects.equals(report.getReporterUserId(), actorUserId);
        if (!actorIsAdmin && !actorIsReporter) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }

        Instant now = Instant.now();
        if (actorIsAdmin && report.getAdminDeletedAt() == null) {
            report.setAdminDeletedAt(now);
        }
        if (actorIsReporter && report.getReporterDeletedAt() == null) {
            report.setReporterDeletedAt(now);
        }

        if (isFullyDeleted(report)) {
            notificationService.deleteAllBugReportNotifications(reportId);
            bugReportRepository.delete(report);
            return;
        }

        bugReportRepository.save(report);

        if (actorIsReporter) {
            notificationService.deleteBugReportNotificationsForUser(reportId, actorUserId);
        }

        if (actorIsAdmin) {
            List<Long> adminUserIds = new ArrayList<>(userRepository.findByRoleIn(Set.of(Role.ADMIN, Role.DEVELOPPER)).stream()
                    .map(AppUser::getId)
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList());

            Long reporterId = report.getReporterUserId();
            if (reporterId != null && !Objects.equals(reporterId, actorUserId)) {
                adminUserIds.removeIf(id -> Objects.equals(id, reporterId));
            }

            notificationService.deleteBugReportNotificationsForUsers(reportId, adminUserIds);
        }
    }

    private void enforceCooldown(Long reporterUserId) {
        bugReportRepository.findTopByReporterUserIdOrderByCreatedAtDesc(reporterUserId)
                .ifPresent(last -> {
                    if (last.getCreatedAt() == null) {
                        return;
                    }

                    Instant now = Instant.now();
                    Instant nextAllowedAt = last.getCreatedAt().plus(SUBMISSION_COOLDOWN);
                    if (nextAllowedAt.isAfter(now)) {
                        long seconds = Duration.between(now, nextAllowedAt).getSeconds();
                        long minutes = Math.max(1, (seconds + 59) / 60);
                        throw new ResponseStatusException(
                                HttpStatus.TOO_MANY_REQUESTS,
                                "Please wait " + minutes + " minute(s) before sending another report."
                        );
                    }
                });
    }

    private String normalizeTitle(String rawTitle) {
        if (rawTitle == null || rawTitle.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title is required");
        }

        String title = rawTitle.replace('\n', ' ').replace('\r', ' ').trim();
        if (title.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title is required");
        }
        if (title.length() > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title must be 200 characters or less");
        }
        return title;
    }

    private String normalizeDescription(String rawDescription) {
        if (rawDescription == null || rawDescription.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Description is required");
        }

        String description = rawDescription.replace("\r\n", "\n").trim();
        if (description.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Description is required");
        }
        if (description.length() > 5000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Description must be 5000 characters or less");
        }
        return description;
    }

    private AppUser requireEnabledUser(Long userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }

        return userRepository.findById(userId)
                .filter(AppUser::isEnabled)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated"));
    }

    private BugReportFeature requireReport(Long reportId) {
        return bugReportRepository.findById(reportId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
    }

    private boolean canManageReport(AppUser actor, BugReportFeature report, Long actorUserId) {
        if (actor.getRole() != null && actor.getRole().isAdminLike()) {
            return true;
        }
        return Objects.equals(report.getReporterUserId(), actorUserId);
    }

    private boolean isFullyDeleted(BugReportFeature report) {
        return report.getReporterDeletedAt() != null && report.getAdminDeletedAt() != null;
    }

    private String resolveConfirmerEmail(Long confirmedByUserId, String fallbackEmail) {
        if (confirmedByUserId == null) {
            return fallbackEmail;
        }
        return userRepository.findById(confirmedByUserId)
                .map(AppUser::getEmail)
                .orElse(fallbackEmail);
    }

    private String resolveReporterEmail(Long reporterUserId) {
        return userRepository.findById(reporterUserId)
                .map(AppUser::getEmail)
                .orElse("user#" + reporterUserId);
    }

    private String buildBugReportThreadMessage(BugReportFeature report, String reporterEmail, String adminEmail) {
        String status = report.getConfirmedAt() == null ? "PENDING" : "CONFIRMED";
        String confirmedAt = report.getConfirmedAt() == null ? "" : report.getConfirmedAt().toString();
        String confirmer = adminEmail == null ? "" : adminEmail;

        return "TITLE:" + report.getTitle()
                + "\nREPORTER:" + reporterEmail
                + "\nSTATUS:" + status
                + "\nADMIN:" + confirmer
                + "\nCONFIRMED_AT:" + confirmedAt
                + "\nDESCRIPTION:\n" + report.getDescription();
    }

    public record BugReportCreatedDto(Long reportId, Instant createdAt, Instant nextAllowedAt) {}

    public record BugReportConfirmDto(
            Long reportId,
            Instant confirmedAt,
            String confirmedBy,
            Long reporterUserId,
            String reportTitle,
            boolean alreadyConfirmed
    ) {}
}
