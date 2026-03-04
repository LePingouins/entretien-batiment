package com.entretienbatiment.backend.auth;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final AppUserRepository userRepo;

    public UserController(AppUserRepository userRepo) {
        this.userRepo = userRepo;
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(Authentication auth) {
        String email = auth.getName();
        return userRepo.findByEmailIgnoreCase(email)
                .map(u -> ResponseEntity.ok(new UserResponse(u.getId(), u.getEmail(), u.getRole(), u.isEnabled(), u.isGetReminders(), u.isGetReminders())))
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/me/settings")
    public ResponseEntity<UserResponse> updateSettings(Authentication auth, @RequestBody UpdateSettingsRequest req) {
        String email = auth.getName();
        return userRepo.findByEmailIgnoreCase(email)
                .map(u -> {
                    if (req.remindersEnabled() != null) {
                        u.setGetReminders(req.remindersEnabled());
                    }
                    if (req.getReminders() != null) {
                        u.setGetReminders(req.getReminders());
                    }
                    AppUser saved = userRepo.save(u);
                    return ResponseEntity.ok(new UserResponse(saved.getId(), saved.getEmail(), saved.getRole(), saved.isEnabled(), saved.isGetReminders(), saved.isGetReminders()));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    public record UpdateSettingsRequest(Boolean remindersEnabled, Boolean getReminders) {}
}
