package com.entretienbatiment.backend.dashboard.service;

import com.entretienbatiment.backend.dashboard.web.dto.DashboardResponse;
import com.entretienbatiment.backend.mileage.MileageEntry;
import com.entretienbatiment.backend.mileage.MileageEntryRepository;
import com.entretienbatiment.backend.urgentworkorders.UrgentWorkOrder;
import com.entretienbatiment.backend.urgentworkorders.UrgentWorkOrderRepository;
import com.entretienbatiment.backend.workorders.data.WorkOrderRepository;
import com.entretienbatiment.backend.workorders.domain.WorkOrder;
import com.entretienbatiment.backend.workorders.domain.WorkOrderStatus;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {

    private final WorkOrderRepository workOrderRepo;
    private final UrgentWorkOrderRepository urgentWorkOrderRepo;
    private final MileageEntryRepository mileageEntryRepo;

    public DashboardService(WorkOrderRepository workOrderRepo,
                            UrgentWorkOrderRepository urgentWorkOrderRepo,
                            MileageEntryRepository mileageEntryRepo) {
        this.workOrderRepo = workOrderRepo;
        this.urgentWorkOrderRepo = urgentWorkOrderRepo;
        this.mileageEntryRepo = mileageEntryRepo;
    }

    @Transactional(readOnly = true)
    public DashboardResponse getDashboardStats() {
        long totalWorkOrders = workOrderRepo.count();
        
        Specification<WorkOrder> activeWorkOrdersSpec = (root, query, cb) -> 
            cb.and(
                cb.notEqual(root.get("status"), WorkOrderStatus.COMPLETED),
                cb.notEqual(root.get("status"), WorkOrderStatus.CANCELLED)
            );
        long activeWorkOrders = workOrderRepo.count(activeWorkOrdersSpec);

        long totalUrgentWorkOrders = urgentWorkOrderRepo.count();

        Specification<UrgentWorkOrder> activeUrgentSpec = (root, query, cb) -> 
            cb.notEqual(root.get("status"), "COMPLETED");
        long activeUrgentWorkOrders = urgentWorkOrderRepo.count(activeUrgentSpec);

        long totalMileageEntries = mileageEntryRepo.count();
        // Since mileage usually doesn't have "active" state in same way, 
        // maybe unarchived is interesting, or just total. 
        // Assuming "active" means unarchived for mileage.
        Specification<MileageEntry> unarchivedMileageSpec = (root, query, cb) -> 
            cb.isFalse(root.get("archived"));
        long unarchivedMileageEntries = mileageEntryRepo.count(unarchivedMileageSpec);

        // We can just return totalMileageEntries as requested, 
        // but maybe unarchived is better contextually if ARCHIVED means "old".
        // The DTO has "mileageEntries" which we can map to total or unarchived.
        // Let's use total for now as requested "how many Mileage there are".
        
        return new DashboardResponse(
            totalWorkOrders,
            activeWorkOrders,
            totalUrgentWorkOrders,
            activeUrgentWorkOrders,
            totalMileageEntries
        );
    }
}
