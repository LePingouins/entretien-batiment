package com.entretienbatiment.backend.auth;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminSeeder {

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
        };
    }
}
