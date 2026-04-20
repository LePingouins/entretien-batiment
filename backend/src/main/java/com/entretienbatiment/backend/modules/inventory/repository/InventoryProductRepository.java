package com.entretienbatiment.backend.modules.inventory.repository;

import com.entretienbatiment.backend.modules.inventory.model.InventoryProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InventoryProductRepository extends JpaRepository<InventoryProduct, Long> {

    List<InventoryProduct> findByArchivedFalseOrderByNameAsc();

    Optional<InventoryProduct> findBySkuIgnoreCase(String sku);

    Optional<InventoryProduct> findByBarcode(String barcode);

    @Query("SELECT p FROM InventoryProduct p WHERE p.archived = false " +
           "AND (LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR p.barcode = :q) ORDER BY p.name")
    List<InventoryProduct> search(@Param("q") String query);

    List<InventoryProduct> findByCategory_IdAndArchivedFalse(Long categoryId);

    @Query("SELECT DISTINCT p.locationZone FROM InventoryProduct p WHERE p.locationZone IS NOT NULL AND p.archived = false ORDER BY p.locationZone")
    List<String> findDistinctZones();
}
