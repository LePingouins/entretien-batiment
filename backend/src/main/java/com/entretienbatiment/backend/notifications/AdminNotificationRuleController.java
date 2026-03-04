package com.entretienbatiment.backend.notifications;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/notification-rules")
@PreAuthorize("hasRole('ADMIN')")
public class AdminNotificationRuleController {

    private final NotificationService notificationService;

    public AdminNotificationRuleController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<NotificationService.NotificationRecipientRuleDto> list() {
        return notificationService.getRecipientRules();
    }

    @PutMapping
    public List<NotificationService.NotificationRecipientRuleDto> update(
            @RequestBody List<NotificationService.NotificationRecipientRuleUpdateRequest> updates,
            Authentication authentication
    ) {
        List<NotificationService.NotificationRecipientRuleDto> result = notificationService.updateRecipientRules(updates);
        String actor = authentication != null ? authentication.getName() : "admin";
        notificationService.notifyAdmins(
                "Notification Rules Updated",
                "Notification recipient rules were saved by \"" + actor + "\".",
                "/admin/users",
                "admin-settings-update"
        );
        return result;
    }
}