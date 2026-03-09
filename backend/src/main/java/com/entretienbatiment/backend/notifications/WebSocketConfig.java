package com.entretienbatiment.backend.notifications;

import org.springframework.context.annotation.Configuration;

@Configuration
public class WebSocketConfig {
    // WebSocket broker wiring is intentionally optional in this build.
    // NotificationWebSocketSender will use messaging when available.
}
