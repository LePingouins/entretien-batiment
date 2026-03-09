package com.entretienbatiment.backend.security;

import com.entretienbatiment.backend.auth.AppUser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey key;
    private final int accessMinutes;

    public JwtService(
            @Value("${security.jwt.secret}") String secret,
            @Value("${security.jwt.access-minutes}") int accessMinutes
    ) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessMinutes = accessMinutes;
    }

    public String createAccessToken(AppUser user) {
        Instant now = Instant.now();
        Instant exp;
        if (user.getRole() != null) {
            String role = user.getRole().name();
            if (role.equals("ADMIN") || role.equals("DEVELOPPER") || role.equals("TECH") || role.equals("WORKER")) {
                // 1 week = 7 days * 24 hours * 60 minutes * 60 seconds
                exp = now.plusSeconds(7L * 24 * 60 * 60);
            } else {
                exp = now.plusSeconds(accessMinutes * 60L);
            }
        } else {
            exp = now.plusSeconds(accessMinutes * 60L);
        }

        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(key)
                .compact();
    }

    public io.jsonwebtoken.Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
