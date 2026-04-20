package com.entretienbatiment.backend.modules.inventory.repository;

import com.entretienbatiment.backend.modules.inventory.model.InventoryCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface InventoryCategoryRepository extends JpaRepository<InventoryCategory, Long> {
    Optional<InventoryCategory> findByNameIgnoreCase(String name);
}
