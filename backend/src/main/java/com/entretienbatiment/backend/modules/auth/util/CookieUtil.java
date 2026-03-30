package com.entretienbatiment.backend.modules.auth.util;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class CookieUtil {

    private final String cookieName;
    private final boolean secure;

    public CookieUtil(
            @Value("${security.cookie.name}") String cookieName,
            @Value("${security.cookie.secure}") boolean secure
    ) {
        this.cookieName = cookieName;
        this.secure = secure;
    }

    public String getCookieName() {
        return cookieName;
    }

    public void setPersistentRefreshCookie(HttpServletResponse res, String value, int maxAgeSeconds) {
        Cookie cookie = baseRefreshCookie(value);
        cookie.setMaxAge(maxAgeSeconds);
        res.addCookie(cookie);
    }

    public void setSessionRefreshCookie(HttpServletResponse res, String value) {
        Cookie cookie = baseRefreshCookie(value);
        // Session cookie: no explicit Max-Age, browser clears it on session end.
        res.addCookie(cookie);
    }

    private Cookie baseRefreshCookie(String value) {
        Cookie cookie = new Cookie(cookieName, value);
        cookie.setHttpOnly(true);
        cookie.setSecure(secure);
        cookie.setPath("/api/auth");
        // SameSite is not directly supported by Cookie API in a portable way.
        // For local dev, this is fine. For prod, we can set SameSite=None via header if needed.
        return cookie;
    }

    public void clearRefreshCookie(HttpServletResponse res) {
        Cookie cookie = new Cookie(cookieName, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(secure);
        cookie.setPath("/api/auth");
        cookie.setMaxAge(0);
        res.addCookie(cookie);
    }
}
