package com.entretienbatiment.backend.security;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestSecureController {
    @GetMapping("/api/me")
    public String me(Authentication auth) {
        return "You are authenticated as userId=" + auth.getName();
    }
}
