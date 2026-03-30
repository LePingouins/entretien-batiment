package com.entretienbatiment.backend.modules.bugreport.controller;

import com.entretienbatiment.backend.common.security.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import com.entretienbatiment.backend.modules.bugreport.service.BugReportService;
import com.entretienbatiment.backend.modules.bugreport.model.BugReportFeature;

@RestController
@RequestMapping("/api/bug-reports")
public class BugReportController {

    private final BugReportService bugReportService;
    private final CurrentUser currentUser;

    public BugReportController(BugReportService bugReportService, CurrentUser currentUser) {
        this.bugReportService = bugReportService;
        this.currentUser = currentUser;
    }

    @PostMapping
    public ResponseEntity<BugReportCreatedResponse> submit(@RequestBody CreateBugReportRequest request) {
        Long userId = currentUser.userIdOrNull();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        BugReportService.BugReportCreatedDto saved = bugReportService.submitReport(userId, request.title(), request.description());
        return ResponseEntity.status(HttpStatus.CREATED).body(new BugReportCreatedResponse(
                saved.reportId(),
                saved.createdAt(),
                saved.nextAllowedAt()
        ));
    }

    @PostMapping("/{reportId}/confirm")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BugReportConfirmedResponse> confirm(@PathVariable Long reportId) {
        Long userId = currentUser.userIdOrNull();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        BugReportService.BugReportConfirmDto confirmed = bugReportService.confirmReport(reportId, userId);
        return ResponseEntity.ok(new BugReportConfirmedResponse(
                confirmed.reportId(),
                confirmed.confirmedAt(),
                confirmed.confirmedBy(),
                confirmed.reporterUserId(),
                confirmed.reportTitle(),
                confirmed.alreadyConfirmed()
        ));
    }

    @PutMapping("/{reportId}/read")
    public ResponseEntity<Void> markReportAsRead(@PathVariable Long reportId) {
        Long userId = currentUser.userIdOrNull();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        bugReportService.markReportAsRead(reportId, userId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{reportId}")
    public ResponseEntity<Void> deleteReport(@PathVariable Long reportId) {
        Long userId = currentUser.userIdOrNull();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        bugReportService.deleteReportForUser(reportId, userId);
        return ResponseEntity.ok().build();
    }

    public record CreateBugReportRequest(String title, String description) {}

    public record BugReportCreatedResponse(Long reportId, Instant createdAt, Instant nextAllowedAt) {}

    public record BugReportConfirmedResponse(
            Long reportId,
            Instant confirmedAt,
            String confirmedBy,
            Long reporterUserId,
            String reportTitle,
            boolean alreadyConfirmed
    ) {}
}
