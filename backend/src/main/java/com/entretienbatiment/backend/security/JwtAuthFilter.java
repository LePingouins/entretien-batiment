package com.entretienbatiment.backend.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);
    private final JwtService jwtService;

    public JwtAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String header = request.getHeader(HttpHeaders.AUTHORIZATION);


        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);

            try {
                Claims claims = jwtService.parseClaims(token);

                String email = claims.get("email", String.class);
                String role = claims.get("role", String.class);
                String userId = claims.getSubject(); // keep it if you want

                log.info("JWT Auth: email={}, role={}, userId={}", email, role, userId);

                var auth = new UsernamePasswordAuthenticationToken(
                        email, // ✅ principal is email now
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + role))
                );

                // Optional: store userId in details for later use
                auth.setDetails(userId);

                log.info("Setting authorities: {}", auth.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(auth);

            } catch (Exception ex) {
                log.warn("JWT Auth failed: {}", ex.toString());
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }
}
