package com.entretienbatiment.backend.mileage;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.entretienbatiment.backend.workorders.domain.WorkOrder;
import com.entretienbatiment.backend.urgentworkorders.UrgentWorkOrder;
import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

@RestController
@RequestMapping("/api/mileage")
public class MileageEntryController {
    @Autowired
    private MileageEntryRepository repository;

    @Autowired
    private EntityManager entityManager;

    @GetMapping
    public List<MileageEntry> getAll() {
        try {
            return repository.findByArchivedFalse();
        } catch (Exception e) {
            // Fallback for backward compatibility if column doesn't exist yet (during migration)
            return repository.findAll(); 
        }
    }

    @GetMapping("/archived")
    public List<MileageEntry> getArchived(@RequestParam(required = false) String q,
                                          @RequestParam(required = false) String startDate,
                                          @RequestParam(required = false) String endDate) {
        java.time.LocalDate start = null;
        if (startDate != null && !startDate.isEmpty()) {
            try {
                start = java.time.LocalDate.parse(startDate);
            } catch (java.time.format.DateTimeParseException e) {
                // Ignore invalid date
            }
        }
        java.time.LocalDate end = null;
        if (endDate != null && !endDate.isEmpty()) {
            try {
                end = java.time.LocalDate.parse(endDate);
            } catch (java.time.format.DateTimeParseException e) {
                // Ignore invalid date
            }
        }
        org.springframework.data.jpa.domain.Specification<MileageEntry> spec =
            MileageEntrySpecifications.archivedEquals(true)
            .and(MileageEntrySpecifications.textOrIdSearch(q))
            .and(MileageEntrySpecifications.dateAfter(start))
            .and(MileageEntrySpecifications.dateBefore(end));
        // Use JpaSpecificationExecutor to support Specification queries
        return ((org.springframework.data.jpa.repository.JpaSpecificationExecutor<MileageEntry>) repository).findAll(spec);
    }



    @PostMapping
    public MileageEntry create(@RequestBody MileageEntry entry) {
        // Support linking by workOrderId/urgentWorkOrderId from frontend
        Long workOrderId = entry.getWorkOrderId();
        Long urgentWorkOrderId = entry.getUrgentWorkOrderId();
        if (workOrderId != null) {
            WorkOrder wo = entityManager.find(WorkOrder.class, workOrderId);
            entry.setWorkOrder(wo);
        }
        if (urgentWorkOrderId != null) {
            UrgentWorkOrder uwo = entityManager.find(UrgentWorkOrder.class, urgentWorkOrderId);
            entry.setUrgentWorkOrder(uwo);
        }
        return repository.save(entry);
    }

    @PutMapping("/{id}")
    public MileageEntry update(@PathVariable Long id, @RequestBody MileageEntry entry) {
        MileageEntry existing = repository.findById(id).orElseThrow();
        existing.setDate(entry.getDate());
        existing.setSupplier(entry.getSupplier());
        existing.setStartKm(entry.getStartKm());
        existing.setEndKm(entry.getEndKm());
        Long workOrderId = entry.getWorkOrderId();
        Long urgentWorkOrderId = entry.getUrgentWorkOrderId();
        if (workOrderId != null) {
            WorkOrder wo = entityManager.find(WorkOrder.class, workOrderId);
            existing.setWorkOrder(wo);
        } else {
            existing.setWorkOrder(null);
        }
        if (urgentWorkOrderId != null) {
            UrgentWorkOrder uwo = entityManager.find(UrgentWorkOrder.class, urgentWorkOrderId);
            existing.setUrgentWorkOrder(uwo);
        } else {
            existing.setUrgentWorkOrder(null);
        }
        MileageEntry saved = repository.save(existing);
        // Force populating transient IDs for response
        saved.setWorkOrderId(saved.getWorkOrder() != null ? saved.getWorkOrder().getId() : null);
        saved.setUrgentWorkOrderId(saved.getUrgentWorkOrder() != null ? saved.getUrgentWorkOrder().getId() : null);
        return saved;
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repository.deleteById(id);
    }

    @PatchMapping("/{id}/archive")
    public void archive(@PathVariable Long id) {
        repository.findById(id).ifPresent(entry -> {
            entry.setArchived(true);
            entry.setArchivedAt(java.time.LocalDateTime.now());
            repository.save(entry);
        });
    }

    @PatchMapping("/{id}/unarchive")
    public void unarchive(@PathVariable Long id) {
        repository.findById(id).ifPresent(entry -> {
            entry.setArchived(false);
            entry.setArchivedAt(null);
            repository.save(entry);
        });
    }
}
