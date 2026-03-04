package com.entretienbatiment.backend.auth;

import com.entretienbatiment.backend.notifications.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private static final String DEFAULT_PASSWORD = "Horizon";

    private final AppUserRepository userRepo;
    private final PasswordEncoder encoder;
    private final NotificationService notificationService;

    public AdminUserController(AppUserRepository userRepo, PasswordEncoder encoder, NotificationService notificationService) {
        this.userRepo = userRepo;
        this.encoder = encoder;
        this.notificationService = notificationService;
    }

    @PostMapping
    public UserResponse invite(@RequestBody CreateUserRequest req) {
        String normalizedEmail = normalizeEmail(req.email());
        if (normalizedEmail == null) {
            throw badRequest("email is required");
        }
        if (req.role() == null) {
            throw badRequest("role is required");
        }
        if (userRepo.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
            throw badRequest("email already exists");
        }

        AppUser user = new AppUser();
        user.setEmail(normalizedEmail);
        user.setRole(req.role());
        user.setPasswordHash(encoder.encode(DEFAULT_PASSWORD));
        user.setEnabled(true);

        AppUser saved = userRepo.save(user);

        notificationService.notifyAdmins(
            "User Invited",
            "User \"" + saved.getEmail() + "\" was invited.",
            "/admin/users",
            "user-invite"
        );
        notificationService.notifyUser(
            saved.getId(),
            "Welcome to Horizon",
            "Your account is ready. Sign in with your invited email and default password Horizon, then change your password in settings.",
            notificationsPathForRole(saved.getRole()),
            "user-welcome"
        );

        return toResponse(saved);
    }

    @PostMapping("/invite")
    public UserResponse inviteAlias(@RequestBody CreateUserRequest req) {
        return invite(req);
    }

    @GetMapping
    public List<UserResponse> list() {
        return userRepo.findAll().stream()
                .sorted((a, b) -> a.getEmail().compareToIgnoreCase(b.getEmail()))
                .map(this::toResponse)
                .toList();
    }

    @PatchMapping("/{id}/activate")
    public UserResponse activate(@PathVariable Long id) {
        AppUser user = getUserOrThrow(id);
        user.setEnabled(true);
        AppUser saved = userRepo.save(user);
        notificationService.notifyAdmins(
                "User Activated",
                "User \"" + saved.getEmail() + "\" was activated.",
                "/admin/users",
                "user-activate"
        );
        return toResponse(saved);
    }

    @PatchMapping("/{id}/deactivate")
    public UserResponse deactivate(@PathVariable Long id, Authentication auth) {
        AppUser user = getUserOrThrow(id);
        if (isSelf(auth, user) && user.getRole() == Role.ADMIN) {
            throw badRequest("You cannot deactivate your own admin account");
        }
        user.setEnabled(false);
        AppUser saved = userRepo.save(user);
        notificationService.notifyAdmins(
                "User Deactivated",
                "User \"" + saved.getEmail() + "\" was deactivated.",
                "/admin/users",
                "user-deactivate"
        );
        return toResponse(saved);
    }

    @PatchMapping("/{id}/disable")
    public UserResponse disable(@PathVariable Long id, Authentication auth) {
        return deactivate(id, auth);
    }

    @PatchMapping("/{id}/role")
    public UserResponse updateRole(@PathVariable Long id, @RequestBody UpdateRoleRequest req, Authentication auth) {
        if (req.role() == null) {
            throw badRequest("role is required");
        }

        AppUser user = getUserOrThrow(id);
        if (isSelf(auth, user) && req.role() != Role.ADMIN) {
            throw badRequest("You cannot remove your own admin role");
        }

        user.setRole(req.role());
        return toResponse(userRepo.save(user));
    }

    @PatchMapping("/{id}/email")
    public UserResponse updateEmail(@PathVariable Long id, @RequestBody UpdateEmailRequest req) {
        AppUser user = getUserOrThrow(id);

        String normalizedEmail = normalizeEmail(req.email());
        if (normalizedEmail == null) {
            throw badRequest("email is required");
        }
        if (!user.getEmail().equalsIgnoreCase(normalizedEmail)
                && userRepo.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
            throw badRequest("email already exists");
        }

        String oldEmail = user.getEmail();
        user.setEmail(normalizedEmail);
        AppUser saved = userRepo.save(user);

        if (!oldEmail.equalsIgnoreCase(normalizedEmail)) {
            notificationService.notifyAdmins(
                    "User Email Updated",
                    "User email changed from \"" + oldEmail + "\" to \"" + normalizedEmail + "\".",
                    "/admin/users",
                    "user-email-change"
            );
        }

        return toResponse(saved);
    }

    @PatchMapping("/{id}/reset-password")
    public UserResponse resetPassword(@PathVariable Long id) {
        AppUser user = getUserOrThrow(id);
        user.setPasswordHash(encoder.encode(DEFAULT_PASSWORD));
        AppUser saved = userRepo.save(user);
        notificationService.notifyAdmins(
                "User Password Reset",
                "Password was reset for user \"" + saved.getEmail() + "\".",
                "/admin/users",
                "user-reset-password"
        );
        return toResponse(saved);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication auth) {
        AppUser user = getUserOrThrow(id);
        if (isSelf(auth, user)) {
            throw badRequest("You cannot delete your own account");
        }

        String deletedEmail = user.getEmail();
        userRepo.delete(user);

        notificationService.notifyAdmins(
                "User Deleted",
                "User \"" + deletedEmail + "\" was deleted.",
                "/admin/users",
                "user-delete"
        );
    }

    private AppUser getUserOrThrow(Long id) {
        return userRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private boolean isSelf(Authentication auth, AppUser user) {
        return auth != null
                && auth.getName() != null
                && auth.getName().equalsIgnoreCase(user.getEmail());
    }

    private String notificationsPathForRole(Role role) {
        if (role == Role.ADMIN) return "/admin/notifications";
        if (role == Role.TECH) return "/tech/notifications";
        return "/worker/notifications";
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
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

    private record UpdateRoleRequest(Role role) {}
    private record UpdateEmailRequest(String email) {}
}
