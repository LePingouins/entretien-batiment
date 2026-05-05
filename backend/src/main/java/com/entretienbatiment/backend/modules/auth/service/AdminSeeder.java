package com.entretienbatiment.backend.modules.auth.service;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.entretienbatiment.backend.modules.auth.model.AppUser;
import com.entretienbatiment.backend.modules.auth.model.Role;
import com.entretienbatiment.backend.modules.auth.repository.AppUserRepository;

@Configuration
public class AdminSeeder {

    @Bean
    CommandLineRunner seedAdmin(AppUserRepository repo, PasswordEncoder encoder) {
        return args -> {
            String adminEmail = System.getenv().getOrDefault("SEED_ADMIN_EMAIL", "admin@entretien.local");
            String adminPassword = System.getenv().getOrDefault("SEED_ADMIN_PASSWORD", "ChangeMe123!");
            String devEmail = System.getenv().getOrDefault("SEED_DEV_EMAIL", "");
            String devPassword = System.getenv().getOrDefault("SEED_DEV_PASSWORD", "");

            if (repo.findByEmailIgnoreCase(adminEmail).isEmpty()) {
                AppUser admin = new AppUser();
                admin.setEmail(adminEmail);
                admin.setRole(Role.ADMIN);
                admin.setPasswordHash(encoder.encode(adminPassword));
                admin.setEnabled(true);
                repo.save(admin);
                System.out.println("✅ Seeded ADMIN: " + adminEmail + " (change password ASAP)");
            }

            if (!devEmail.isBlank()) {
                repo.findByEmailIgnoreCase(devEmail).ifPresentOrElse(existing -> {
                    boolean changed = false;
                    if (existing.getRole() != Role.DEVELOPPER) {
                        existing.setRole(Role.DEVELOPPER);
                        changed = true;
                    }
                    if (!existing.isEnabled()) {
                        existing.setEnabled(true);
                        changed = true;
                    }
                    if (changed) {
                        repo.save(existing);
                        System.out.println("✅ Enforced DEVELOPPER role for configured dev account");
                    }
                }, () -> {
                    if (!devPassword.isBlank()) {
                        AppUser developper = new AppUser();
                        developper.setEmail(devEmail);
                        developper.setRole(Role.DEVELOPPER);
                        developper.setPasswordHash(encoder.encode(devPassword));
                        developper.setEnabled(true);
                        developper.setGetReminders(true);
                        repo.save(developper);
                        System.out.println("✅ Seeded DEVELOPPER account");
                    }
                });
            }
        };
    }
}
