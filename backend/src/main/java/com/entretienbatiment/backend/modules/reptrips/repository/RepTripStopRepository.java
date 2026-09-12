package com.entretienbatiment.backend.modules.reptrips.repository;

import com.entretienbatiment.backend.modules.reptrips.model.RepTripStop;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RepTripStopRepository extends JpaRepository<RepTripStop, Long> {
    List<RepTripStop> findByTripIdOrderByStoppedAt(Long tripId);
    Optional<RepTripStop> findByClientOperationIdAndTrip_Id(String clientOperationId, Long tripId);
}
