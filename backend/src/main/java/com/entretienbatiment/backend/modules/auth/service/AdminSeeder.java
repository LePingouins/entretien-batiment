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

    private static final String DEFAULT_PASSWORD = "Horizon";
    private static final String DEVELOPPER_EMAIL = "oligoudreault@gmail.com";

    @Bean
    CommandLineRunner seedAdmin(AppUserRepository repo, PasswordEncoder encoder) {
        return args -> {
            if (repo.findByEmailIgnoreCase("admin@entretien.local").isEmpty()) {
                AppUser admin = new AppUser();
                admin.setEmail("admin@entretien.local");
                admin.setRole(Role.ADMIN);
                admin.setPasswordHash(encoder.encode("ChangeMe123!"));
                admin.setEnabled(true);
                repo.save(admin);
                System.out.println("✅ Seeded ADMIN: admin@entretien.local / ChangeMe123! (change ASAP)");
            }

            repo.findByEmailIgnoreCase(DEVELOPPER_EMAIL).ifPresentOrElse(existing -> {
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
                    System.out.println("✅ Enforced DEVELOPPER role for: " + DEVELOPPER_EMAIL);
                }
            }, () -> {
                AppUser developper = new AppUser();
                developper.setEmail(DEVELOPPER_EMAIL);
                developper.setRole(Role.DEVELOPPER);
                developper.setPasswordHash(encoder.encode(DEFAULT_PASSWORD));
                developper.setEnabled(true);
                developper.setGetReminders(true);
                repo.save(developper);
                System.out.println("✅ Seeded DEVELOPPER: " + DEVELOPPER_EMAIL + " / " + DEFAULT_PASSWORD);
            });

            if (repo.findByEmailIgnoreCase("andre@gmail.com").isEmpty()) {
                AppUser technician = new AppUser();
                technician.setEmail("andre@gmail.com");
                technician.setRole(Role.TECH);
                technician.setPasswordHash(encoder.encode(DEFAULT_PASSWORD));
                technician.setEnabled(true);
                technician.setGetReminders(true);
                repo.save(technician);
                System.out.println("✅ Seeded TECH: andre@gmail.com / " + DEFAULT_PASSWORD);
            }
        };
    }
}
