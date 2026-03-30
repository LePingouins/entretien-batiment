package com.entretienbatiment.backend.modules.auth.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import com.entretienbatiment.backend.modules.auth.model.RefreshToken;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByTokenHashAndRevokedFalse(String tokenHash);
}
