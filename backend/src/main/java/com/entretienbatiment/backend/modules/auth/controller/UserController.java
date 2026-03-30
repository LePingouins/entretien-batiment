package com.entretienbatiment.backend.modules.auth.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import com.entretienbatiment.backend.modules.auth.model.AppUser;
import com.entretienbatiment.backend.modules.auth.model.Role;
import com.entretienbatiment.backend.modules.auth.repository.AppUserRepository;
import com.entretienbatiment.backend.modules.auth.dto.UserResponse;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final AppUserRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    public UserController(AppUserRepository userRepo, PasswordEncoder passwordEncoder) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(Authentication auth) {
        String email = auth.getName();
        return userRepo.findByEmailIgnoreCase(email)
                .map(u -> ResponseEntity.ok(toResponse(u)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/technicians")
    public java.util.List<UserResponse> getTechnicians() {
        return userRepo.findByRole(Role.TECH).stream()
                .filter(AppUser::isEnabled)
                .sorted(java.util.Comparator.comparing(AppUser::getEmail, String.CASE_INSENSITIVE_ORDER))
                .map(this::toResponse)
                .toList();
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
                    return ResponseEntity.ok(toResponse(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changeMyPassword(Authentication auth, @RequestBody ChangePasswordRequest req) {
        String email = auth.getName();

        AppUser user = userRepo.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (req.currentPassword() == null || req.currentPassword().isBlank()) {
            throw badRequest("currentPassword is required");
        }
        if (req.newPassword() == null || req.newPassword().isBlank()) {
            throw badRequest("newPassword is required");
        }
        if (req.newPassword().length() < 6) {
            throw badRequest("newPassword must be at least 6 characters");
        }
        if (!passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw badRequest("Current password is incorrect");
        }
        if (passwordEncoder.matches(req.newPassword(), user.getPasswordHash())) {
            throw badRequest("New password must be different from current password");
        }

        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepo.save(user);
    }

    private UserResponse toResponse(AppUser user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getRole(),
                user.isEnabled(),
                user.isGetReminders(),
                user.isGetReminders()
        );
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    public record UpdateSettingsRequest(Boolean remindersEnabled, Boolean getReminders) {}
    public record ChangePasswordRequest(String currentPassword, String newPassword) {}
}
