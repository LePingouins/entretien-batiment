package com.entretienbatiment.backend.modules.urgentworkorders.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import com.entretienbatiment.backend.modules.urgentworkorders.model.UrgentWorkOrder;

public interface UrgentWorkOrderRepository extends JpaRepository<UrgentWorkOrder, Long>, JpaSpecificationExecutor<UrgentWorkOrder> {

    @Query("SELECT u FROM UrgentWorkOrder u WHERE u.archived = false AND u.status IN :statuses AND u.updatedAt < :cutoffTime")
    List<UrgentWorkOrder> findUrgentWorkOrdersToArchive(
        @Param("statuses") List<String> statuses,
        @Param("cutoffTime") java.time.LocalDateTime cutoffTime
    );

    List<UrgentWorkOrder> findByArchivedFalse();
            // Removed broken JPQL query. Use Specification for advanced filtering.
}

