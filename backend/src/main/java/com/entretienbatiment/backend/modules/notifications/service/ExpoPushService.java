package com.entretienbatiment.backend.modules.notifications.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.entretienbatiment.backend.modules.notifications.repository.PushTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;

/**
 * Sends push notifications to mobile devices via Expo's push notification
 * service (https://exp.host). Works for both iOS and Android without needing
 * a separate Firebase/APNs setup, since the mobile app is built with Expo.
 */
@Service
public class ExpoPushService {

    private static final Logger log = LoggerFactory.getLogger(ExpoPushService.class);
    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    private final PushTokenRepository pushTokenRepository;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ExpoPushService(PushTokenRepository pushTokenRepository) {
        this.pushTokenRepository = pushTokenRepository;
    }

    @Async
    public void sendToUser(Long userId, String title, String body, String href) {
        if (userId == null) return;
        List<String> tokens = pushTokenRepository.findByUserId(userId).stream()
                .map(t -> t.getToken())
                .toList();
        sendToTokens(tokens, title, body, href);
    }

    @Async
    public void sendToUsers(List<Long> userIds, String title, String body, String href) {
        if (userIds == null || userIds.isEmpty()) return;
        List<String> tokens = pushTokenRepository.findByUserIdIn(userIds).stream()
                .map(t -> t.getToken())
                .toList();
        sendToTokens(tokens, title, body, href);
    }

    private void sendToTokens(List<String> tokens, String title, String body, String href) {
        if (tokens.isEmpty()) return;
        try {
            ArrayNode messages = objectMapper.createArrayNode();
            for (String token : tokens) {
                if (token == null || !token.startsWith("ExponentPushToken")) continue;
                ObjectNode message = objectMapper.createObjectNode();
                message.put("to", token);
                message.put("title", title);
                message.put("body", body);
                message.put("sound", "default");
                ObjectNode data = message.putObject("data");
                if (href != null) data.put("href", href);
                messages.add(message);
            }
            if (messages.isEmpty()) return;

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(EXPO_PUSH_URL))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(8))
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(messages)))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                log.warn("Expo push send failed: status={} body={}", response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.warn("Expo push send error: {}", e.getMessage());
        }
    }
}
