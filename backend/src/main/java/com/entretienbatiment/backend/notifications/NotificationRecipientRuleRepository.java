package com.entretienbatiment.backend.notifications;

import com.entretienbatiment.backend.auth.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NotificationRecipientRuleRepository extends JpaRepository<NotificationRecipientRule, Long> {
    Optional<NotificationRecipientRule> findBySourceAndRole(String source, Role role);
    List<NotificationRecipientRule> findBySource(String source);
    List<NotificationRecipientRule> findBySourceIn(Collection<String> sources);
}