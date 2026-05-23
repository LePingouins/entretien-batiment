package com.entretienbatiment.backend.modules.reptrips.repository;

import com.entretienbatiment.backend.modules.reptrips.model.RepTripStop;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RepTripStopRepository extends JpaRepository<RepTripStop, Long> {
    List<RepTripStop> findByTripIdOrderByStoppedAt(Long tripId);
}
