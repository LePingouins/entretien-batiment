package com.entretienbatiment.backend.workorders.data;

import com.entretienbatiment.backend.workorders.domain.WorkOrder;
import com.entretienbatiment.backend.workorders.domain.WorkOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface WorkOrderRepository extends JpaRepository<WorkOrder, Long>, JpaSpecificationExecutor<WorkOrder> {

    List<WorkOrder> findByAssignedTo_Id(Long techId);

    Optional<WorkOrder> findByIdAndAssignedTo_Id(Long id, Long techId);

    List<WorkOrder> findByAssignedTo_IdOrderByCreatedAtDesc(Long techId);

    long countByAssignedTo_IdAndStatus(Long techId, WorkOrderStatus status);

}
