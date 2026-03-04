package com.entretienbatiment.backend.notifications;

import com.entretienbatiment.backend.auth.AppUser;
import com.entretienbatiment.backend.auth.AppUserRepository;
import com.entretienbatiment.backend.auth.Role;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional
public class NotificationService {

    private static final List<String> MANAGED_SOURCES = List.of(
            "workorder-create",
            "urgent-create",
            "mileage-create",
            "REMINDER",
            "user-invite",
            "user-welcome",
            "user-reset-password",
            "user-email-change",
            "user-delete",
            "user-activate",
            "user-deactivate"
    );

    private static final EnumSet<Role> ALL_ROLES = EnumSet.of(Role.ADMIN, Role.TECH, Role.WORKER);

    private static final Map<String, EnumSet<Role>> DEFAULT_ROLE_RULES = defaultRoleRules();

    private final NotificationRepository notificationRepository;
    private final NotificationRecipientRuleRepository recipientRuleRepository;
    private final AppUserRepository userRepository;
    private final NotificationWebSocketSender webSocketSender;

    public NotificationService(
            NotificationRepository notificationRepository,
            NotificationRecipientRuleRepository recipientRuleRepository,
            AppUserRepository userRepository,
            NotificationWebSocketSender webSocketSender
    ) {
        this.notificationRepository = notificationRepository;
        this.recipientRuleRepository = recipientRuleRepository;
        this.userRepository = userRepository;
        this.webSocketSender = webSocketSender;
    }

    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByTargetUserIdOrderByDateDesc(userId);
    }

    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadForUser(userId);
    }

    public void markAsRead(Long userId, String notificationId) {
        notificationRepository.markAsRead(userId, notificationId);
    }

    public void markBugReportAsRead(Long userId, Long bugReportId) {
        if (userId == null || bugReportId == null) {
            return;
        }
        notificationRepository.markBugReportAsRead(userId, bugReportId);
        webSocketSender.sendNotificationUpdate(userId);
    }

    public void deleteNotification(Long userId, String notificationId) {
        notificationRepository.deleteForUser(userId, notificationId);
    }

    public void refreshBugReportFeatureThread(Long bugReportId, String title, String message, String href) {
        if (bugReportId == null) {
            return;
        }

        List<Long> recipients = notificationRepository.findDistinctTargetUserIdsByBugReportId(bugReportId);
        notificationRepository.updateBugReportFeaturePayload(bugReportId, title, message, href);
        pushNotificationUpdates(recipients);
    }

    public void deleteBugReportNotificationsForUser(Long bugReportId, Long userId) {
        if (bugReportId == null || userId == null) {
            return;
        }

        notificationRepository.deleteBugReportForUser(bugReportId, userId);
        webSocketSender.sendNotificationUpdate(userId);
    }

    public void deleteBugReportNotificationsForUsers(Long bugReportId, List<Long> userIds) {
        if (bugReportId == null || userIds == null || userIds.isEmpty()) {
            return;
        }

        List<Long> distinctUserIds = userIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (distinctUserIds.isEmpty()) {
            return;
        }

        notificationRepository.deleteBugReportForUsers(bugReportId, distinctUserIds);
        pushNotificationUpdates(distinctUserIds);
    }

    public void deleteAllBugReportNotifications(Long bugReportId) {
        if (bugReportId == null) {
            return;
        }

        List<Long> recipients = notificationRepository.findDistinctTargetUserIdsByBugReportId(bugReportId);
        notificationRepository.deleteAllForBugReport(bugReportId);
        pushNotificationUpdates(recipients);
    }

    public void createBroadcast(String title, String message, String href) {
        // Create a notification for every user
        List<AppUser> allUsers = userRepository.findAll();
        for (AppUser user : allUsers) {
            Notification n = new Notification();
            n.setId(UUID.randomUUID().toString());
            n.setTargetUserId(user.getId());
            n.setTitle(title);
            n.setMessage(message);
            n.setHref(href);
            n.setSource("broadcast");
            notificationRepository.save(n);
        }
        webSocketSender.sendBroadcastUpdate();
    }

    public void notifyAdmins(String title, String message, String href, String source) {
        notifyAdmins(title, message, href, source, null);
    }

    public void notifyAdmins(String title, String message, String href, String source, Long bugReportId) {
        List<AppUser> admins = userRepository.findByRole(com.entretienbatiment.backend.auth.Role.ADMIN);
        for (AppUser admin : admins) {
            if (!admin.isEnabled() || admin.getRole() == null) {
                continue;
            }
            if (!isRoleEnabledForSource(source, admin.getRole())) {
                continue;
            }
            Notification n = new Notification();
            n.setId(UUID.randomUUID().toString());
            n.setTargetUserId(admin.getId());
            n.setTitle(title);
            n.setMessage(message);
            n.setHref(href);
            n.setSource(source);
            n.setBugReportId(bugReportId);
            notificationRepository.save(n);
            webSocketSender.sendNotificationUpdate(admin.getId());
        }
    }

    public void notifyUser(Long targetUserId, String title, String message, String href, String source) {
        notifyUser(targetUserId, title, message, href, source, null);
    }

    public void notifyUser(Long targetUserId, String title, String message, String href, String source, Long bugReportId) {
        if (targetUserId == null) {
            return;
        }

        AppUser target = userRepository.findById(targetUserId).orElse(null);
        if (target == null || !target.isEnabled() || target.getRole() == null) {
            return;
        }
        if (!isRoleEnabledForSource(source, target.getRole())) {
            return;
        }

        Notification n = new Notification();
        n.setId(UUID.randomUUID().toString());
        n.setTargetUserId(targetUserId);
        n.setTitle(title);
        n.setMessage(message);
        n.setHref(href);
        n.setSource(source);
        n.setBugReportId(bugReportId);
        notificationRepository.save(n);
        webSocketSender.sendNotificationUpdate(targetUserId);
    }

    @Transactional(readOnly = true)
    public List<NotificationRecipientRuleDto> getRecipientRules() {
        Map<String, Map<Role, NotificationRecipientRule>> bySource = recipientRuleRepository
                .findBySourceIn(MANAGED_SOURCES)
                .stream()
                .collect(Collectors.groupingBy(
                        NotificationRecipientRule::getSource,
                        Collectors.toMap(NotificationRecipientRule::getRole, Function.identity(), (a, b) -> b)
                ));

        return MANAGED_SOURCES.stream()
                .map(source -> {
                    Map<Role, NotificationRecipientRule> rules = bySource.get(source);
                    return new NotificationRecipientRuleDto(
                            source,
                            resolveRule(source, Role.ADMIN, rules),
                            resolveRule(source, Role.TECH, rules),
                            resolveRule(source, Role.WORKER, rules)
                    );
                })
                .toList();
    }

    public List<NotificationRecipientRuleDto> updateRecipientRules(List<NotificationRecipientRuleUpdateRequest> updates) {
        if (updates == null || updates.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one rule is required");
        }

        for (NotificationRecipientRuleUpdateRequest update : updates) {
            if (update.source() == null || !MANAGED_SOURCES.contains(update.source())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported notification source: " + update.source());
            }

            upsertRule(update.source(), Role.ADMIN, Boolean.TRUE.equals(update.admin()));
            upsertRule(update.source(), Role.TECH, Boolean.TRUE.equals(update.tech()));
            upsertRule(update.source(), Role.WORKER, Boolean.TRUE.equals(update.worker()));
        }

        return getRecipientRules();
    }

    private void upsertRule(String source, Role role, boolean enabled) {
        NotificationRecipientRule rule = recipientRuleRepository.findBySourceAndRole(source, role)
                .orElseGet(() -> {
                    NotificationRecipientRule created = new NotificationRecipientRule();
                    created.setSource(source);
                    created.setRole(role);
                    return created;
                });
        rule.setEnabled(enabled);
        recipientRuleRepository.save(rule);
    }

    private boolean resolveRule(String source, Role role, Map<Role, NotificationRecipientRule> sourceRules) {
        if (sourceRules != null && sourceRules.get(role) != null) {
            return sourceRules.get(role).isEnabled();
        }
        return DEFAULT_ROLE_RULES.getOrDefault(source, ALL_ROLES).contains(role);
    }

    private boolean isRoleEnabledForSource(String source, Role role) {
        if (source == null || source.isBlank() || role == null) {
            return true;
        }

        return recipientRuleRepository.findBySourceAndRole(source, role)
                .map(NotificationRecipientRule::isEnabled)
                .orElse(DEFAULT_ROLE_RULES.getOrDefault(source, ALL_ROLES).contains(role));
    }

    private static Map<String, EnumSet<Role>> defaultRoleRules() {
        Map<String, EnumSet<Role>> map = new LinkedHashMap<>();
        map.put("workorder-create", EnumSet.of(Role.ADMIN, Role.TECH));
        map.put("urgent-create", EnumSet.of(Role.ADMIN, Role.TECH));
        map.put("mileage-create", EnumSet.of(Role.ADMIN));
        map.put("REMINDER", EnumSet.of(Role.ADMIN, Role.TECH, Role.WORKER));

        map.put("user-invite", EnumSet.of(Role.ADMIN));
        map.put("user-welcome", EnumSet.of(Role.ADMIN, Role.TECH, Role.WORKER));
        map.put("user-reset-password", EnumSet.of(Role.ADMIN));
        map.put("user-email-change", EnumSet.of(Role.ADMIN));
        map.put("user-delete", EnumSet.of(Role.ADMIN));
        map.put("user-activate", EnumSet.of(Role.ADMIN));
        map.put("user-deactivate", EnumSet.of(Role.ADMIN));
        return map;
    }

    private void pushNotificationUpdates(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return;
        }

        userIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .forEach(webSocketSender::sendNotificationUpdate);
    }

    public record NotificationRecipientRuleDto(String source, boolean admin, boolean tech, boolean worker) {}

    public record NotificationRecipientRuleUpdateRequest(String source, Boolean admin, Boolean tech, Boolean worker) {}
}
