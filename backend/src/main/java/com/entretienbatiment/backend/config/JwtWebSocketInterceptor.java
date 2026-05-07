package com.entretienbatiment.backend.config;

import com.entretienbatiment.backend.common.security.JwtService;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

@Component
public class JwtWebSocketInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;

    public JwtWebSocketInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authorization = accessor.getFirstNativeHeader("Authorization");
            if (authorization == null || !authorization.startsWith("Bearer ")) {
                throw new MessagingException("Unauthorized: missing token");
            }
            String token = authorization.substring(7);
            try {
                jwtService.parseClaims(token);
            } catch (Exception e) {
                throw new MessagingException("Unauthorized: invalid token");
            }
        }
        return message;
    }
}
