package com.entretienbatiment.backend.modules.notifications.controller;

import com.entretienbatiment.backend.common.security.CurrentUser;
import com.entretienbatiment.backend.modules.notifications.model.PushToken;
import com.entretienbatiment.backend.modules.notifications.repository.PushTokenRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/push-tokens")
public class PushTokenController {

    private final PushTokenRepository repository;
    private final CurrentUser currentUser;

    public PushTokenController(PushTokenRepository repository, CurrentUser currentUser) {
        this.repository = repository;
        this.currentUser = currentUser;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void register(@RequestBody PushTokenRequest req) {
        Long userId = currentUser.userIdRequired();
        PushToken token = repository.findByToken(req.token()).orElseGet(PushToken::new);
        token.setUserId(userId);
        token.setToken(req.token());
        token.setPlatform(req.platform());
        token.setUpdatedAt(Instant.now());
        repository.save(token);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unregister(@RequestBody PushTokenRequest req) {
        repository.deleteByToken(req.token());
    }

    public record PushTokenRequest(String token, String platform) {}
}
