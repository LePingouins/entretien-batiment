package com.entretienbatiment.backend.auth;

import com.entretienbatiment.backend.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class AuthService {

    private final AppUserRepository userRepo;
    private final RefreshTokenRepository refreshRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    private final int refreshDays;

    public AuthService(
            AppUserRepository userRepo,
            RefreshTokenRepository refreshRepo,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            @Value("${security.jwt.refresh-days}") int refreshDays
    ) {
        this.userRepo = userRepo;
        this.refreshRepo = refreshRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshDays = refreshDays;
    }

    public LoginResult login(String email, String rawPassword) {
        AppUser user = userRepo.findByEmailIgnoreCase(email)
                .filter(AppUser::isEnabled)
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw new RuntimeException("Invalid credentials");
        }

        // Create access token
        String accessToken = jwtService.createAccessToken(user);

        // Create refresh token (store hashed in DB)
        String refreshValue = TokenUtil.generateRefreshTokenValue();
        String refreshHash = TokenUtil.sha256(refreshValue);

        RefreshToken rt = new RefreshToken();
        rt.setUser(user);
        rt.setTokenHash(refreshHash);
        rt.setExpiresAt(Instant.now().plusSeconds(refreshDays * 24L * 3600L));
        rt.setRevoked(false);
        refreshRepo.save(rt);

        return new LoginResult(accessToken, refreshValue);
    }

    public RefreshResult refresh(String refreshCookieValue) {
        if (refreshCookieValue == null || refreshCookieValue.isBlank()) {
            throw new RuntimeException("Missing refresh token");
        }

        String presentedHash = TokenUtil.sha256(refreshCookieValue);

        RefreshToken existing = refreshRepo.findByTokenHashAndRevokedFalse(presentedHash)
                .orElseThrow(() -> new RuntimeException("Invalid refresh token"));

        if (existing.getExpiresAt().isBefore(Instant.now())) {
            existing.setRevoked(true);
            refreshRepo.save(existing);
            throw new RuntimeException("Refresh token expired");
        }

        // Rotate: revoke old, create new
        existing.setRevoked(true);
        refreshRepo.save(existing);

        AppUser user = existing.getUser();
        if (!user.isEnabled()) {
            throw new RuntimeException("User disabled");
        }

        String newAccessToken = jwtService.createAccessToken(user);

        String newRefreshValue = TokenUtil.generateRefreshTokenValue();
        String newRefreshHash = TokenUtil.sha256(newRefreshValue);

        RefreshToken rotated = new RefreshToken();
        rotated.setUser(user);
        rotated.setTokenHash(newRefreshHash);
        rotated.setExpiresAt(Instant.now().plusSeconds(refreshDays * 24L * 3600L));
        rotated.setRevoked(false);
        refreshRepo.save(rotated);

        return new RefreshResult(newAccessToken, newRefreshValue);
    }

    public void logout(String refreshCookieValue) {
        if (refreshCookieValue == null || refreshCookieValue.isBlank()) {
            return; // nothing to do
        }
        String hash = TokenUtil.sha256(refreshCookieValue);
        refreshRepo.findByTokenHashAndRevokedFalse(hash).ifPresent(rt -> {
            rt.setRevoked(true);
            refreshRepo.save(rt);
        });
    }

    public record LoginResult(String accessToken, String refreshTokenValue) {}
    public record RefreshResult(String accessToken, String refreshTokenValue) {}
}
