package com.entretienbatiment.backend.modules.notifications.repository;

import com.entretienbatiment.backend.modules.notifications.model.PushToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PushTokenRepository extends JpaRepository<PushToken, Long> {
    List<PushToken> findByUserId(Long userId);
    List<PushToken> findByUserIdIn(List<Long> userIds);
    Optional<PushToken> findByToken(String token);
    void deleteByToken(String token);
}
