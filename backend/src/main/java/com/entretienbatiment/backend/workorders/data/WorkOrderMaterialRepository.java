package com.entretienbatiment.backend.workorders.data;

import com.entretienbatiment.backend.workorders.domain.WorkOrderMaterial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkOrderMaterialRepository extends JpaRepository<WorkOrderMaterial, Long> {
    List<WorkOrderMaterial> findByWorkOrderIdOrderByCreatedAtAsc(Long workOrderId);
    void deleteByIdAndWorkOrderId(Long id, Long workOrderId);
}
