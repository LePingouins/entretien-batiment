package com.entretienbatiment.backend.modules.inventory.repository;

import com.entretienbatiment.backend.modules.inventory.model.InventoryCountSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InventoryCountSessionRepository extends JpaRepository<InventoryCountSession, Long> {
    List<InventoryCountSession> findAllByOrderByCreatedAtDesc();
}
