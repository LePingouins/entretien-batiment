package com.entretienbatiment.backend.modules.permissions.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import com.entretienbatiment.backend.modules.permissions.model.UserPageAccessOverride;

public interface UserPageAccessOverrideRepository extends JpaRepository<UserPageAccessOverride, Long> {
    List<UserPageAccessOverride> findByUserId(Long userId);
    List<UserPageAccessOverride> findByUserIdIn(List<Long> userIds);
    Optional<UserPageAccessOverride> findByUserIdAndPageKey(Long userId, String pageKey);
    void deleteByUserIdAndPageKey(Long userId, String pageKey);
}
