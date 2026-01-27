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

    // Reorder urgent work orders within a single status column
    public void reorderUrgentWorkOrdersInColumn(String status, java.util.List<Long> orderedIds) {
        // Fetch all urgent work orders with the given status
        java.util.List<UrgentWorkOrder> columnItems = repository.findAll()
            .stream()
            .filter(wo -> status.equals(wo.getStatus()))
            .toList();

        // Validate: all IDs must belong to the specified status
        java.util.Set<Long> validIds = columnItems.stream().map(UrgentWorkOrder::getId).collect(java.util.stream.Collectors.toSet());
        for (Long id : orderedIds) {
            if (!validIds.contains(id)) {
                throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Urgent work order " + id + " does not belong to status " + status
                );
            }
        }

        // Set sortIndex = array index for each id in orderedIds
        java.util.Map<Long, UrgentWorkOrder> woMap = columnItems.stream().collect(java.util.stream.Collectors.toMap(UrgentWorkOrder::getId, wo -> wo));
        for (int i = 0; i < orderedIds.size(); i++) {
            UrgentWorkOrder wo = woMap.get(orderedIds.get(i));
            if (wo != null) {
                wo.setSortIndex(i);
            }
        }

        // For any other items in the column not in orderedIds, put them after
        int nextIndex = orderedIds.size();
        for (UrgentWorkOrder wo : columnItems) {
            if (!orderedIds.contains(wo.getId())) {
                wo.setSortIndex(nextIndex++);
            }
        }

        repository.saveAll(columnItems);
    }
}
