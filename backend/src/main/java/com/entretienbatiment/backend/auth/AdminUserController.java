package com.entretienbatiment.backend.auth;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final AppUserRepository userRepo;
    private final PasswordEncoder encoder;

    public AdminUserController(AppUserRepository userRepo, PasswordEncoder encoder) {
        this.userRepo = userRepo;
        this.encoder = encoder;
    }

    @PostMapping
    public UserResponse create(@RequestBody CreateUserRequest req) {
        if (req.role() == null) {
            throw new IllegalArgumentException("role is required");
        }
        if (userRepo.findByEmailIgnoreCase(req.email()).isPresent()) {
            throw new IllegalArgumentException("email already exists");
        }

        AppUser user = new AppUser();
        user.setEmail(req.email());
        user.setRole(req.role());
        user.setPasswordHash(encoder.encode(req.password()));
        user.setEnabled(true);

        AppUser saved = userRepo.save(user);
        return new UserResponse(saved.getId(), saved.getEmail(), saved.getRole(), saved.isEnabled(), saved.isGetReminders(), saved.isGetReminders());
    }

    @GetMapping
    public List<UserResponse> list() {
        return userRepo.findAll().stream()
                .map(u -> new UserResponse(u.getId(), u.getEmail(), u.getRole(), u.isEnabled(), u.isGetReminders(), u.isGetReminders()))
                .toList();
    }

    @PatchMapping("/{id}/disable")
    public UserResponse disable(@PathVariable Long id) {
        AppUser user = userRepo.findById(id).orElseThrow();
        user.setEnabled(false);
        AppUser saved = userRepo.save(user);
        return new UserResponse(saved.getId(), saved.getEmail(), saved.getRole(), saved.isEnabled(), saved.isGetReminders(), saved.isGetReminders());
    }
}
