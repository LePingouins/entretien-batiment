package com.entretienbatiment.backend.urgentworkorders;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

import com.entretienbatiment.backend.workorders.service.WorkOrderReminderScheduler;

@Service
public class UrgentWorkOrderService {
    private final UrgentWorkOrderRepository repository;
    private final WorkOrderReminderScheduler reminderScheduler;

    public UrgentWorkOrderService(UrgentWorkOrderRepository repository, WorkOrderReminderScheduler reminderScheduler) {       
        this.repository = repository;
        this.reminderScheduler = reminderScheduler;
    }

    public Optional<UrgentWorkOrder> findById(Long id) {
        return repository.findById(id);
    }

    public List<UrgentWorkOrder> findAll() {
        return repository.findByArchivedFalse();
    }

    public List<UrgentWorkOrder> findAllActiveFiltered(String q, String status, String location, String technician) {
        Long technicianId = parseTechnicianId(technician);
        org.springframework.data.jpa.domain.Specification<UrgentWorkOrder> spec =
            UrgentWorkOrderSpecifications.archivedEquals(false)
            .and(UrgentWorkOrderSpecifications.textOrIdSearch(q))
            .and(UrgentWorkOrderSpecifications.statusEquals(status))
            .and(UrgentWorkOrderSpecifications.locationEquals(location))
            .and(UrgentWorkOrderSpecifications.assignedToUserIdEquals(technicianId));
        return repository.findAll(spec);
    }

    public List<UrgentWorkOrder> findAllArchived(String q, String status, String location) {
        org.springframework.data.jpa.domain.Specification<UrgentWorkOrder> spec =
            UrgentWorkOrderSpecifications.archivedEquals(true)
            .and(UrgentWorkOrderSpecifications.textOrIdSearch(q))
            .and(UrgentWorkOrderSpecifications.statusEquals(status))
            .and(UrgentWorkOrderSpecifications.locationEquals(location));
        return repository.findAll(spec);
    }


    @org.springframework.transaction.annotation.Transactional
    public int archiveOldUrgentWorkOrders(java.time.LocalDateTime cutoffTime) {
        List<UrgentWorkOrder> toArchive = repository.findUrgentWorkOrdersToArchive(
                List.of("COMPLETED", "CANCELLED"),
                cutoffTime
        );

        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        for (UrgentWorkOrder uwo : toArchive) {
            uwo.setArchived(true);
            uwo.setArchivedAt(now);
        }

        if (!toArchive.isEmpty()) {
            repository.saveAll(toArchive);
        }

        return toArchive.size();
    }

    public UrgentWorkOrder save(UrgentWorkOrder urgentWorkOrder) {
        UrgentWorkOrder saved = repository.save(urgentWorkOrder);
        reminderScheduler.checkAndSendReminder(saved);
        return saved;
    }

    public void deleteById(Long id) {
        // Delete the associated attachment file if it exists
        repository.findById(id).ifPresent(uwo -> {
            String filename = uwo.getAttachmentFilename();
            if (filename != null && !filename.isBlank()) {
                try {
                    java.nio.file.Files.deleteIfExists(java.nio.file.Paths.get("uploads", "workorders").resolve(filename));
                } catch (Exception ignored) {
                    // Keep request successful even if stale file cannot be removed.
                }
            }
            repository.deleteById(id);
        });
    }

    public void archive(Long id) {
        repository.findById(id).ifPresent(wo -> {
            wo.setArchived(true);
            wo.setArchivedAt(java.time.LocalDateTime.now());
            repository.save(wo);
        });
    }

    public void unarchive(Long id) {
        repository.findById(id).ifPresent(wo -> {
            wo.setArchived(false);
            wo.setArchivedAt(null);
            repository.save(wo);
        });
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

    private Long parseTechnicianId(String technician) {
        if (technician == null || technician.isBlank()) {
            return null;
        }

        try {
            return Long.parseLong(technician.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
