package com.entretienbatiment.backend.modules.auth.controller;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import com.entretienbatiment.backend.modules.auth.service.AuthService;
import com.entretienbatiment.backend.modules.auth.util.CookieUtil;
import com.entretienbatiment.backend.modules.auth.dto.LoginRequest;
import com.entretienbatiment.backend.modules.auth.dto.LoginResponse;
import com.entretienbatiment.backend.modules.audit.service.AuditLogService;


@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final CookieUtil cookieUtil;
    private final int refreshDays;
    private final AuditLogService auditLogService;

    public AuthController(
            AuthService authService,
            CookieUtil cookieUtil,
            @Value("${security.jwt.refresh-days}") int refreshDays,
            AuditLogService auditLogService
    ) {
        this.authService = authService;
        this.cookieUtil = cookieUtil;
        this.refreshDays = refreshDays;
        this.auditLogService = auditLogService;
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest req, HttpServletResponse res, HttpServletRequest request) {
        AuthService.LoginResult result = authService.login(req.email(), req.password(), req.rememberMeEnabled());
        writeRefreshCookie(res, result.refreshTokenValue(), result.persistent());
        auditLogService.logWithUser("LOGIN", result.userId(), result.email(), result.role(),
                null, null, null, null, request);
        return new LoginResponse(result.accessToken());
    }

    @PostMapping("/refresh")
    public LoginResponse refresh(HttpServletRequest request, HttpServletResponse res) {
        String cookieValue = readCookie(request, cookieUtil.getCookieName());
        AuthService.RefreshResult result = authService.refresh(cookieValue);
        writeRefreshCookie(res, result.refreshTokenValue(), result.persistent());

        return new LoginResponse(result.accessToken());
    }

    @PostMapping("/logout")
    public void logout(HttpServletRequest request, HttpServletResponse res) {
        // Log before revoking so the SecurityContext still holds user info
        auditLogService.log("LOGOUT", null, null, null, null, request);
        String cookieValue = readCookie(request, cookieUtil.getCookieName());
        authService.logout(cookieValue);
        cookieUtil.clearRefreshCookie(res);
    }

    private String readCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie c : cookies) {
            if (name.equals(c.getName())) return c.getValue();
        }
        return null;
    }

    private void writeRefreshCookie(HttpServletResponse res, String refreshTokenValue, boolean persistent) {
        if (persistent) {
            int maxAgeSeconds = refreshDays * 24 * 3600;
            cookieUtil.setPersistentRefreshCookie(res, refreshTokenValue, maxAgeSeconds);
            return;
        }
        cookieUtil.setSessionRefreshCookie(res, refreshTokenValue);
    }
}
