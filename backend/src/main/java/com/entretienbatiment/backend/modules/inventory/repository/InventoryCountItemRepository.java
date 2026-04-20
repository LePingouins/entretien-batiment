package com.entretienbatiment.backend.modules.inventory.repository;

import com.entretienbatiment.backend.modules.inventory.model.InventoryCountItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InventoryCountItemRepository extends JpaRepository<InventoryCountItem, Long> {

    List<InventoryCountItem> findBySession_IdOrderByProduct_NameAsc(Long sessionId);

    Optional<InventoryCountItem> findBySession_IdAndProduct_Id(Long sessionId, Long productId);

    long countBySession_Id(Long sessionId);

    long countBySession_IdAndCountedQtyIsNotNull(Long sessionId);

    @Query("SELECT COUNT(i) FROM InventoryCountItem i WHERE i.session.id = :sid " +
           "AND i.countedQty IS NOT NULL AND i.countedQty <> i.expectedQty")
    long countDiscrepancies(@Param("sid") Long sessionId);

    @Query("SELECT i FROM InventoryCountItem i JOIN FETCH i.product p " +
           "WHERE i.session.id = :sid ORDER BY p.name")
    List<InventoryCountItem> findBySessionWithProduct(@Param("sid") Long sessionId);

    @Query("SELECT i FROM InventoryCountItem i JOIN FETCH i.product p " +
           "WHERE i.session.id = :sid " +
           "AND (LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR p.barcode = :q) ORDER BY p.name")
    List<InventoryCountItem> searchInSession(@Param("sid") Long sessionId, @Param("q") String query);

    @Query("SELECT i FROM InventoryCountItem i JOIN FETCH i.product p " +
           "WHERE i.session.id = :sid AND p.locationZone = :zone ORDER BY p.name")
    List<InventoryCountItem> findBySessionAndZone(@Param("sid") Long sessionId, @Param("zone") String zone);
}
