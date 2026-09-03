package com.entretienbatiment.backend.modules.auth.controller;

import com.entretienbatiment.backend.modules.audit.service.AuditLogService;
import com.entretienbatiment.backend.modules.auth.dto.LoginRequest;
import com.entretienbatiment.backend.modules.auth.dto.MobileRefreshRequest;
import com.entretienbatiment.backend.modules.auth.dto.MobileTokenResponse;
import com.entretienbatiment.backend.modules.auth.service.AuthService;
import com.entretienbatiment.backend.modules.auth.util.CookieUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @Mock
    private CookieUtil cookieUtil;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private HttpServletRequest request;

    private AuthController controller;

    @BeforeEach
    void setUp() {
        controller = new AuthController(authService, cookieUtil, 30, auditLogService);
    }

    @Test
    void mobileLoginReturnsAccessAndRefreshTokens() {
        when(authService.login("tech@example.com", "secret", true))
                .thenReturn(new AuthService.LoginResult(
                        "access-token", "refresh-token", true, 12L,
                        "tech@example.com", "TECH"
                ));

        MobileTokenResponse response = controller.mobileLogin(
                new LoginRequest("tech@example.com", "secret", true),
                request
        );

        assertEquals("access-token", response.accessToken());
        assertEquals("refresh-token", response.refreshToken());
        verify(authService).login("tech@example.com", "secret", true);
    }

    @Test
    void mobileRefreshRotatesBothTokens() {
        when(authService.refresh("old-refresh-token"))
                .thenReturn(new AuthService.RefreshResult("new-access-token", "new-refresh-token", true));

        MobileTokenResponse response = controller.mobileRefresh(
                new MobileRefreshRequest("old-refresh-token")
        );

        assertEquals("new-access-token", response.accessToken());
        assertEquals("new-refresh-token", response.refreshToken());
        verify(authService).refresh("old-refresh-token");
    }

    @Test
    void mobileLogoutRevokesRefreshToken() {
        controller.mobileLogout(new MobileRefreshRequest("refresh-token"), request);

        verify(authService).logout("refresh-token");
    }
}