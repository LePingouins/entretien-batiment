package com.entretienbatiment.backend.notifications;

import com.entretienbatiment.backend.auth.AppUser;
import com.entretienbatiment.backend.auth.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final AppUserRepository userRepository;
    private final NotificationWebSocketSender webSocketSender;

    public NotificationService(NotificationRepository notificationRepository, AppUserRepository userRepository, NotificationWebSocketSender webSocketSender) {
        this.notificationRepository = notificationRepository;
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

    public void deleteNotification(Long userId, String notificationId) {
        notificationRepository.deleteForUser(userId, notificationId);
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
        List<AppUser> admins = userRepository.findByRole(com.entretienbatiment.backend.auth.Role.ADMIN);
        for (AppUser admin : admins) {
            Notification n = new Notification();
            n.setId(UUID.randomUUID().toString());
            n.setTargetUserId(admin.getId());
            n.setTitle(title);
            n.setMessage(message);
            n.setHref(href);
            n.setSource(source);
            notificationRepository.save(n);
            webSocketSender.sendNotificationUpdate(admin.getId());
        }
    }

    public void notifyUser(Long targetUserId, String title, String message, String href, String source) {
        Notification n = new Notification();
        n.setId(UUID.randomUUID().toString());
        n.setTargetUserId(targetUserId);
        n.setTitle(title);
        n.setMessage(message);
        n.setHref(href);
        n.setSource(source);
        notificationRepository.save(n);
        webSocketSender.sendNotificationUpdate(targetUserId);
    }
}
