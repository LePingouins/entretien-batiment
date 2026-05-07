package com.entretienbatiment.backend.modules.auth.controller;

import com.entretienbatiment.backend.modules.auth.model.AppUser;
import com.entretienbatiment.backend.modules.auth.model.Role;
import com.entretienbatiment.backend.modules.auth.repository.AppUserRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@RestController
@RequestMapping("/api/presence")
public class PresenceController {

    private final AppUserRepository userRepo;

    public PresenceController(AppUserRepository userRepo) {
        this.userRepo = userRepo;
    }

    /**
     * Ping endpoint — any authenticated user can call this.
     * Updates the user's last_active_at so the DevInsights "Online Now" panel works.
     */
    @PostMapping("/ping")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void ping(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) return;
        userRepo.findByEmailIgnoreCase(auth.getName()).ifPresent(user -> {
            user.setLastActiveAt(Instant.now());
            userRepo.save(user);
        });
    }

    /**
     * Returns users who pinged within the last 5 minutes (DEVELOPER only).
     */
    @GetMapping("/online")
    @PreAuthorize("hasRole('DEVELOPPER')")
    public List<OnlineUserDto> getOnlineUsers() {
        Instant threshold = Instant.now().minus(5, ChronoUnit.MINUTES);
        return userRepo.findByLastActiveAtAfterOrderByLastActiveAtDesc(threshold)
                .stream()
                .map(u -> new OnlineUserDto(u.getId(), u.getEmail(), u.getRole().name(), u.getLastActiveAt()))
                .toList();
    }

    public record OnlineUserDto(Long id, String email, String role, Instant lastActiveAt) {}
}
