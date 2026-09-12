package com.entretienbatiment.backend.modules.reptrips.repository;

import com.entretienbatiment.backend.modules.reptrips.model.RepTripPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RepTripPhotoRepository extends JpaRepository<RepTripPhoto, Long> {
    List<RepTripPhoto> findByTripIdOrderByUploadedAtAsc(Long tripId);
    Optional<RepTripPhoto> findByClientOperationIdAndTripId(String clientOperationId, Long tripId);
    void deleteByTripId(Long tripId);
}
