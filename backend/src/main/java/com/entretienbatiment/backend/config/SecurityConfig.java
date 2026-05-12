package com.entretienbatiment.backend.config;

import com.entretienbatiment.backend.common.security.LoginRateLimitFilter;
import com.entretienbatiment.backend.modules.auth.model.AppUser;
import com.entretienbatiment.backend.modules.auth.repository.AppUserRepository;
import com.entretienbatiment.backend.modules.auth.model.Role;
import com.entretienbatiment.backend.common.security.JwtAuthFilter;
import com.entretienbatiment.backend.common.security.JwtService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@EnableMethodSecurity
@Configuration
public class SecurityConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    UserDetailsService userDetailsService(AppUserRepository appUserRepository) {
        return username -> {
            AppUser u = appUserRepository.findByEmailIgnoreCase(username)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found"));

            User.UserBuilder builder = User.withUsername(u.getEmail())
                    .password(u.getPasswordHash())
                    .disabled(!u.isEnabled());

            if (u.getRole() == Role.DEVELOPPER) {
                // DEVELOPPER keeps its own role while inheriting ADMIN permissions.
                builder.roles(Role.DEVELOPPER.name(), Role.ADMIN.name());
            } else {
                builder.roles(u.getRole().name());
            }

            return builder.build();
        };
    }

    @Bean
    AuthenticationManager authenticationManager(UserDetailsService uds, PasswordEncoder encoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(uds);
        provider.setPasswordEncoder(encoder);
        return new ProviderManager(provider);
    }

    // ✅ CORS rules for React dev server
    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(
            "http://localhost:5173", 
            "http://localhost:4173",
            "http://10.0.0.109:4173",
            "http://10.0.0.109:5173",
            "https://entretien-batiment.com",
            "https://www.entretien-batiment.com"
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, JwtService jwtService, AppUserRepository appUserRepository, LoginRateLimitFilter loginRateLimitFilter) throws Exception {
        return http
            .cors(cors -> {}) // ✅ IMPORTANT: enables Spring Security CORS handling
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .headers(headers -> headers
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000)
                )
                .frameOptions(frame -> frame.deny())
                .contentTypeOptions(cto -> {})
                .referrerPolicy(referrer -> referrer
                    .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)
                )
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives(
                        "default-src 'self'; " +
                        "script-src 'self'; " +
                        "style-src 'self' 'unsafe-inline'; " +
                        "img-src 'self' data: blob:; " +
                        "font-src 'self' data:; " +
                        "connect-src 'self' wss://entretien-batiment.com wss://www.entretien-batiment.com; " +
                        "frame-ancestors 'none'; " +
                        "base-uri 'self'; " +
                        "form-action 'self';"
                    )
                )
                .addHeaderWriter(new StaticHeadersWriter(
                    "Permissions-Policy",
                    "camera=(), microphone=(), geolocation=(), payment=()"
                ))
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll() // ✅ allow preflight
                .requestMatchers("/api/health").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/ws-notifications/**").permitAll()
                // Make files endpoint authenticated
                .requestMatchers("/api/files/workorders/**").authenticated()
                
                // Allow error page so that exceptions don't get masked as 403 Forbidden
                .requestMatchers("/error").permitAll()

                // Shared page APIs guarded by page access checks at controller level
                .requestMatchers("/api/admin/work-orders/**").authenticated()
                .requestMatchers("/api/admin/dashboard/**").authenticated()
                .requestMatchers("/api/admin/analytics/**").authenticated()
                
                // Admin endpoints - strict
                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                // Developer-only endpoints
                .requestMatchers("/api/developper/**").hasRole("DEVELOPPER")
                
                // Tech dashboard - strict
                .requestMatchers("/api/tech/**").hasRole("TECH")

                // Common secured endpoints
                // Explicitly allow archived endpoints if they are causing issues with authenticated()
                .requestMatchers("/api/mileage/**").authenticated()
                .requestMatchers("/api/urgent-work-orders/**").authenticated()
                
                // Catch-all
                .anyRequest().authenticated()
            )
            .addFilterBefore(loginRateLimitFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(new JwtAuthFilter(jwtService, appUserRepository), UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
