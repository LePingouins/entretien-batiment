package com.entretienbatiment.backend.modules.workorders.repository;

import com.entretienbatiment.backend.modules.workorders.model.WorkOrderMaterial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkOrderMaterialRepository extends JpaRepository<WorkOrderMaterial, Long> {
    List<WorkOrderMaterial> findByWorkOrderIdOrderByCreatedAtAsc(Long workOrderId);
    void deleteByIdAndWorkOrderId(Long id, Long workOrderId);

    @Query("SELECT m FROM WorkOrderMaterial m WHERE m.workOrder.archived = false")
    List<WorkOrderMaterial> findAllNotArchived();
}
