package com.entretienbatiment.backend.modules.reptrips.repository;

import com.entretienbatiment.backend.modules.reptrips.model.RepTripAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RepTripAuditLogRepository extends JpaRepository<RepTripAuditLog, Long> {
    List<RepTripAuditLog> findByTripIdOrderByCreatedAtDesc(Long tripId);
}
