package com.entretienbatiment.backend.modules.dashboard.service;

import com.entretienbatiment.backend.modules.dashboard.dto.DashboardResponse;
import com.entretienbatiment.backend.modules.mileage.repository.MileageEntryRepository;
import com.entretienbatiment.backend.modules.urgentworkorders.model.UrgentWorkOrder;
import com.entretienbatiment.backend.modules.urgentworkorders.repository.UrgentWorkOrderRepository;
import com.entretienbatiment.backend.modules.workorders.repository.WorkOrderRepository;
import com.entretienbatiment.backend.modules.workorders.model.WorkOrder;
import com.entretienbatiment.backend.modules.workorders.model.WorkOrderStatus;
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
        
        return new DashboardResponse(
            totalWorkOrders,
            activeWorkOrders,
            totalUrgentWorkOrders,
            activeUrgentWorkOrders,
            totalMileageEntries
        );
    }
}
