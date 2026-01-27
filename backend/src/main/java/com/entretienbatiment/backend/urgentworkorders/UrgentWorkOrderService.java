package com.entretienbatiment.backend.urgentworkorders;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class UrgentWorkOrderService {
    private final UrgentWorkOrderRepository repository;

    public UrgentWorkOrderService(UrgentWorkOrderRepository repository) {
        this.repository = repository;
    }

    public List<UrgentWorkOrder> findAll() {
        return repository.findAll();
    }

    public Optional<UrgentWorkOrder> findById(Long id) {
        return repository.findById(id);
    }

    public UrgentWorkOrder save(UrgentWorkOrder urgentWorkOrder) {
        return repository.save(urgentWorkOrder);
    }

    public void deleteById(Long id) {
        repository.deleteById(id);
    }

        // Batch reorder urgent work orders by updating sortIndex
        public void reorderUrgentWorkOrders(List<UrgentWorkOrderController.UrgentWorkOrderReorderRequest> reorderRequests) {
            List<UrgentWorkOrder> workOrders = repository.findAllById(
                reorderRequests.stream().map(r -> r.id).toList()
            );
            // Map id to new sortIndex
            java.util.Map<Long, Integer> idToSortIndex = new java.util.HashMap<>();
            for (var req : reorderRequests) {
                idToSortIndex.put(req.id, req.sortIndex);
            }
            for (UrgentWorkOrder workOrder : workOrders) {
                Integer newIndex = idToSortIndex.get(workOrder.getId());
                if (newIndex != null) {
                    workOrder.setSortIndex(newIndex);
                }
            }
            repository.saveAll(workOrders);
        }
}
