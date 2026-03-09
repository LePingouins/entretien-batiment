package com.entretienbatiment.backend.notifications;

import org.springframework.beans.factory.NoSuchBeanDefinitionException;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;

@Component
public class NotificationWebSocketSender {
    private final Object messagingTemplate;
    private final Method convertAndSendMethod;

    public NotificationWebSocketSender(ApplicationContext applicationContext) {
        Object resolvedTemplate = null;
        Method resolvedMethod = null;
        try {
            Class<?> templateClass = Class.forName("org.springframework.messaging.simp.SimpMessagingTemplate");
            resolvedTemplate = applicationContext.getBean(templateClass);
            resolvedMethod = templateClass.getMethod("convertAndSend", String.class, Object.class);
        } catch (ClassNotFoundException | NoSuchBeanDefinitionException | NoSuchMethodException ignored) {
            resolvedTemplate = null;
            resolvedMethod = null;
        }
        this.messagingTemplate = resolvedTemplate;
        this.convertAndSendMethod = resolvedMethod;
    }

    public void sendNotificationUpdate(Long userId) {
        send("/topic/notifications/" + userId);
    }

    public void sendBroadcastUpdate() {
        send("/topic/notifications/broadcast");
    }

    private void send(String destination) {
        if (messagingTemplate == null || convertAndSendMethod == null) {
            return;
        }
        try {
            convertAndSendMethod.invoke(messagingTemplate, destination, "update");
        } catch (ReflectiveOperationException ignored) {
            // Keep notifications non-blocking even if messaging is unavailable.
        }
    }
}
