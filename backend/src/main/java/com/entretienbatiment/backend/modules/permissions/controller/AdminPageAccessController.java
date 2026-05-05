package com.entretienbatiment.backend.modules.permissions.controller;

import com.entretienbatiment.backend.modules.notifications.service.NotificationService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import com.entretienbatiment.backend.modules.permissions.service.PageAccessService;

@RestController
@RequestMapping("/api/admin/page-access")
@PreAuthorize("hasRole('ADMIN')")
public class AdminPageAccessController {

    private final PageAccessService pageAccessService;
    private final NotificationService notificationService;

    public AdminPageAccessController(PageAccessService pageAccessService, NotificationService notificationService) {
        this.pageAccessService = pageAccessService;
        this.notificationService = notificationService;
    }

    @GetMapping("/roles")
    public List<PageAccessService.RolePageAccessRuleDto> roleRules() {
        return pageAccessService.getRoleRules();
    }

    @PutMapping("/roles")
    public List<PageAccessService.RolePageAccessRuleDto> updateRoleRules(
            @RequestBody List<PageAccessService.RolePageAccessRuleUpdateRequest> updates,
            Authentication authentication
    ) {
        List<PageAccessService.RolePageAccessRuleDto> result = pageAccessService.updateRoleRules(updates);
        String actor = authentication != null ? authentication.getName() : "admin";
        notificationService.notifyAdmins(
                "Page Access Roles Updated",
                "Page access role rules were saved by \"" + actor + "\".",
                "/admin/users",
                "admin-settings-update"
        );
        return result;
    }

    @GetMapping("/users")
    public List<PageAccessService.UserPageAccessOverviewDto> users() {
        return pageAccessService.getUserAccessOverview();
    }

    @PutMapping("/users/{userId}")
    public PageAccessService.UserPageAccessOverviewDto updateUserOverrides(
            @PathVariable Long userId,
            @RequestBody List<PageAccessService.UserPageAccessUpdateRequest> updates,
            Authentication authentication
    ) {
        PageAccessService.UserPageAccessOverviewDto result = pageAccessService.updateUserOverrides(userId, updates);
        String actor = authentication != null ? authentication.getName() : "admin";
        notificationService.notifyAdmins(
                "User Access Overrides Updated",
                "User access overrides were saved by \"" + actor + "\" for user ID " + userId + ".",
                "/admin/users",
                "admin-settings-update"
        );
        return result;
    }
}
