package com.entretienbatiment.backend.modules.subscriptions.repository;

import com.entretienbatiment.backend.modules.subscriptions.model.SoftwareSubscription;
import com.entretienbatiment.backend.modules.subscriptions.model.SubscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface SoftwareSubscriptionRepository extends JpaRepository<SoftwareSubscription, Long> {

    List<SoftwareSubscription> findByStatus(SubscriptionStatus status);

    List<SoftwareSubscription> findByNextDueDateBetweenAndStatus(
            LocalDate from, LocalDate to, SubscriptionStatus status);

    List<SoftwareSubscription> findAllByOrderByNextDueDateAsc();
}
