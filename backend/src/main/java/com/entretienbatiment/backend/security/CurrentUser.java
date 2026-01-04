package com.entretienbatiment.backend.security;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class CurrentUser {

    public String email() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) return null;
        return auth.getPrincipal().toString(); // ✅ email
    }

    public Long userIdOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;

        Object details = auth.getDetails(); // you stored userId here
        if (details == null) return null;

        try {
            return Long.parseLong(details.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public Long userIdRequired() {
        Long id = userIdOrNull();
        if (id == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "unauthenticated");
        return id;
    }
}
