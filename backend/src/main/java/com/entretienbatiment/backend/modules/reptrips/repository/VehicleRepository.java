package com.entretienbatiment.backend.modules.reptrips.repository;

import com.entretienbatiment.backend.modules.reptrips.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    List<Vehicle> findByActiveTrueOrderByLabelAsc();
    List<Vehicle> findByUserIdAndActiveTrueOrderByLabelAsc(Long userId);
}
