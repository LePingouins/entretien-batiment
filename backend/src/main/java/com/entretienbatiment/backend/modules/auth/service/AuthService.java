package com.entretienbatiment.backend.modules.auth.service;

import com.entretienbatiment.backend.common.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import com.entretienbatiment.backend.modules.auth.model.AppUser;
import com.entretienbatiment.backend.modules.auth.model.RefreshToken;
import com.entretienbatiment.backend.modules.auth.repository.AppUserRepository;
import com.entretienbatiment.backend.modules.auth.repository.RefreshTokenRepository;
import com.entretienbatiment.backend.modules.auth.util.TokenUtil;

@Service
public class AuthService {

    private final AppUserRepository userRepo;
    private final RefreshTokenRepository refreshRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    private final int refreshDays;
    private final int sessionRefreshHours;

    public AuthService(
            AppUserRepository userRepo,
            RefreshTokenRepository refreshRepo,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            @Value("${security.jwt.refresh-days}") int refreshDays,
            @Value("${security.jwt.session-refresh-hours:24}") int sessionRefreshHours
    ) {
        this.userRepo = userRepo;
        this.refreshRepo = refreshRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshDays = refreshDays;
        this.sessionRefreshHours = sessionRefreshHours;
    }

    public LoginResult login(String email, String rawPassword, boolean rememberMe) {
        AppUser user = userRepo.findByEmailIgnoreCase(email)
                .filter(AppUser::isEnabled)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        // Create access token
        String accessToken = jwtService.createAccessToken(user);

        // Create refresh token (store hashed in DB)
        String refreshValue = TokenUtil.generateRefreshTokenValue();
        String refreshHash = TokenUtil.sha256(refreshValue);

        RefreshToken rt = new RefreshToken();
        rt.setUser(user);
        rt.setTokenHash(refreshHash);
        rt.setPersistent(rememberMe);
        rt.setExpiresAt(Instant.now().plusSeconds(refreshTtlSeconds(rememberMe)));
        rt.setRevoked(false);
        refreshRepo.save(rt);

        return new LoginResult(accessToken, refreshValue, rememberMe, user.getId(), user.getEmail(), user.getRole().name());
    }

    public RefreshResult refresh(String refreshCookieValue) {
        if (refreshCookieValue == null || refreshCookieValue.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing refresh token");
        }

        String presentedHash = TokenUtil.sha256(refreshCookieValue);

        RefreshToken existing = refreshRepo.findByTokenHashAndRevokedFalse(presentedHash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));

        if (existing.getExpiresAt().isBefore(Instant.now())) {
            existing.setRevoked(true);
            refreshRepo.save(existing);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token expired");
        }

        // Rotate: revoke old, create new
        existing.setRevoked(true);
        refreshRepo.save(existing);

        AppUser user = existing.getUser();
        if (!user.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User disabled");
        }
        boolean persistent = existing.isPersistent();

        String newAccessToken = jwtService.createAccessToken(user);

        String newRefreshValue = TokenUtil.generateRefreshTokenValue();
        String newRefreshHash = TokenUtil.sha256(newRefreshValue);

        RefreshToken rotated = new RefreshToken();
        rotated.setUser(user);
        rotated.setTokenHash(newRefreshHash);
        rotated.setPersistent(persistent);
        rotated.setExpiresAt(Instant.now().plusSeconds(refreshTtlSeconds(persistent)));
        rotated.setRevoked(false);
        refreshRepo.save(rotated);

        return new RefreshResult(newAccessToken, newRefreshValue, persistent);
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

    private long refreshTtlSeconds(boolean persistent) {
        if (persistent) {
            return refreshDays * 24L * 3600L;
        }
        return sessionRefreshHours * 3600L;
    }

    public record LoginResult(String accessToken, String refreshTokenValue, boolean persistent, Long userId, String email, String role) {}
    public record RefreshResult(String accessToken, String refreshTokenValue, boolean persistent) {}
}
