package com.entretienbatiment.backend.urgentworkorders.repository;

import com.entretienbatiment.backend.urgentworkorders.domain.UrgentWorkOrderMaterial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface UrgentWorkOrderMaterialRepository extends JpaRepository<UrgentWorkOrderMaterial, Long> {
    List<UrgentWorkOrderMaterial> findByUrgentWorkOrderIdOrderByCreatedAtAsc(Long urgentWorkOrderId);

    @Query("SELECT m FROM UrgentWorkOrderMaterial m WHERE m.urgentWorkOrder.archived = false")
    List<UrgentWorkOrderMaterial> findAllNotArchived();
}
