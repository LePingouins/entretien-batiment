package com.entretienbatiment.backend.notifications;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class NotificationWebSocketSender {
    private final SimpMessagingTemplate messagingTemplate;

    public NotificationWebSocketSender(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void sendNotificationUpdate(Long userId) {
        messagingTemplate.convertAndSend("/topic/notifications/" + userId, "update");
    }

    public void sendBroadcastUpdate() {
        messagingTemplate.convertAndSend("/topic/notifications/broadcast", "update");
    }
}
