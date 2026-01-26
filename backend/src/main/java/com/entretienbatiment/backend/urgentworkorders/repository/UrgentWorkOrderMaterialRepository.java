package com.entretienbatiment.backend.urgentworkorders.repository;

import com.entretienbatiment.backend.urgentworkorders.domain.UrgentWorkOrderMaterial;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UrgentWorkOrderMaterialRepository extends JpaRepository<UrgentWorkOrderMaterial, Long> {
    List<UrgentWorkOrderMaterial> findByUrgentWorkOrderIdOrderByCreatedAtAsc(Long urgentWorkOrderId);
}
