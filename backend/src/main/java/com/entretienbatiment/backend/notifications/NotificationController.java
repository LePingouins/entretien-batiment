package com.entretienbatiment.backend.notifications;

import com.entretienbatiment.backend.security.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final CurrentUser currentUser;

    public NotificationController(NotificationService notificationService, CurrentUser currentUser) {
        this.notificationService = notificationService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public ResponseEntity<List<NotificationDto>> getNotifications() {
        Long userId = currentUser.userIdOrNull();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        List<Notification> items = notificationService.getUserNotifications(userId);
        List<NotificationDto> dtos = items.stream().map(NotificationDto::from).collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PutMapping("/read")
    public ResponseEntity<Void> markAllAsRead() {
        Long userId = currentUser.userIdOrNull();
        if (userId == null) return ResponseEntity.status(401).build();
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable String id) {
        Long userId = currentUser.userIdOrNull();
        if (userId == null) return ResponseEntity.status(401).build();
        notificationService.markAsRead(userId, id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable String id) {
        Long userId = currentUser.userIdOrNull();
        if (userId == null) return ResponseEntity.status(401).build();
        notificationService.deleteNotification(userId, id);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/broadcast")
    public ResponseEntity<Void> createBroadcast(@RequestBody BroadcastRequest req) {
        notificationService.createBroadcast(req.title(), req.message(), req.href(), req.targetUserId());
        return ResponseEntity.ok().build();
    }

    public record BroadcastRequest(String title, String message, String href, Long targetUserId) {}

    public record NotificationDto(
            String id,
            String title,
            String message,
            Instant date,
            boolean read,
            String href,
            String source,
            Long bugReportId
    ) {
        public static NotificationDto from(Notification n) {
            return new NotificationDto(
                    n.getId(),
                    n.getTitle(),
                    n.getMessage(),
                    n.getDate(),
                    n.isRead(),
                    n.getHref(),
                    n.getSource(),
                    n.getBugReportId()
            );
        }
    }
}

