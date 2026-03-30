package com.entretienbatiment.backend.modules.notifications.repository;

import com.entretienbatiment.backend.modules.auth.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import com.entretienbatiment.backend.modules.notifications.model.NotificationRecipientRule;

public interface NotificationRecipientRuleRepository extends JpaRepository<NotificationRecipientRule, Long> {
    Optional<NotificationRecipientRule> findBySourceAndRole(String source, Role role);
    List<NotificationRecipientRule> findBySource(String source);
    List<NotificationRecipientRule> findBySourceIn(Collection<String> sources);
}