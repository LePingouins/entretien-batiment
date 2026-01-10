package com.entretienbatiment.backend.workorders.data;

import com.entretienbatiment.backend.workorders.domain.WorkOrder;
import com.entretienbatiment.backend.workorders.domain.WorkOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WorkOrderRepository extends JpaRepository<WorkOrder, Long>, JpaSpecificationExecutor<WorkOrder> {

    List<WorkOrder> findByAssignedTo_Id(Long techId);

    Optional<WorkOrder> findByIdAndAssignedTo_Id(Long id, Long techId);

    List<WorkOrder> findByAssignedTo_IdOrderByCreatedAtDesc(Long techId);

    long countByAssignedTo_IdAndStatus(Long techId, WorkOrderStatus status);

    /**
     * Find all work orders by status, ordered for Kanban display:
     * 1. Items with non-null sortIndex come first, ordered by sortIndex ASC
     * 2. Items with null sortIndex come after, ordered by priority DESC (URGENT > HIGH > MEDIUM > LOW), then createdAt DESC
     * 
     * ORDERING RULES:
     * - sortIndex IS NOT NULL: order by sortIndex ASC (manual order)
     * - sortIndex IS NULL: order by priority DESC, createdAt DESC (automatic priority-based insertion)
     * 
     * Uses native query because PostgreSQL enum ordering requires special handling.
     */
    @Query(value = """
        SELECT * FROM work_orders w
        WHERE w.status = CAST(:status AS work_order_status)
        ORDER BY 
            CASE WHEN w.sort_index IS NOT NULL THEN 0 ELSE 1 END,
            w.sort_index ASC NULLS LAST,
            CASE w.priority 
                WHEN 'URGENT' THEN 0
                WHEN 'HIGH' THEN 1
                WHEN 'MEDIUM' THEN 2
                WHEN 'LOW' THEN 3
            END,
            w.created_at DESC
        """, nativeQuery = true)
    List<WorkOrder> findByStatusOrderedForKanban(@Param("status") String status);

    /**
     * Find all work orders by status for reordering operations.
     */
    List<WorkOrder> findByStatus(WorkOrderStatus status);

    /**
     * Find the maximum sortIndex in a status column.
     */
    @Query("SELECT MAX(w.sortIndex) FROM WorkOrder w WHERE w.status = :status")
    Integer findMaxSortIndexByStatus(@Param("status") WorkOrderStatus status);

    /**
     * Find all work orders by IDs.
     */
    List<WorkOrder> findByIdIn(List<Long> ids);
}
