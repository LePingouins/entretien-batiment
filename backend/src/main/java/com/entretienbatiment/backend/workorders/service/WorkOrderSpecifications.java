package com.entretienbatiment.backend.workorders.service;

import com.entretienbatiment.backend.workorders.domain.WorkOrder;
import com.entretienbatiment.backend.workorders.domain.WorkOrderPriority;
import com.entretienbatiment.backend.workorders.domain.WorkOrderStatus;
import org.springframework.data.jpa.domain.Specification;

public final class WorkOrderSpecifications {

    private WorkOrderSpecifications() {}

    public static Specification<WorkOrder> statusEquals(WorkOrderStatus status) {
        return (root, query, cb) -> status == null ? cb.conjunction() : cb.equal(root.get("status"), status);
    }

    public static Specification<WorkOrder> priorityEquals(WorkOrderPriority priority) {
        return (root, query, cb) -> priority == null ? cb.conjunction() : cb.equal(root.get("priority"), priority);
    }

    public static Specification<WorkOrder> assignedToUserIdEquals(Long userId) {
        return (root, query, cb) -> userId == null ? cb.conjunction() : cb.equal(root.get("assignedTo").get("id"), userId);
    }

    public static Specification<WorkOrder> createdByUserIdEquals(Long userId) {
        return (root, query, cb) -> userId == null ? cb.conjunction() : cb.equal(root.get("createdBy").get("id"), userId);
    }

    public static Specification<WorkOrder> textSearch(String q) {
        if (q == null || q.isBlank()) {
            return (root, query, cb) -> cb.conjunction();
        }

        String like = "%" + q.trim().toLowerCase() + "%";

        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("title")), like),
                cb.like(cb.lower(root.get("description")), like),
                cb.like(cb.lower(root.get("location")), like)
        );
    }

    public static Specification<WorkOrder> locationEquals(String location) {
        return (root, query, cb) -> {
            if (location == null || location.isBlank()) {
                return cb.conjunction();
            }
            return cb.equal(cb.lower(root.get("location")), location.toLowerCase());
        };
    }

    /**
     * Filter by archived status.
     * If archived is null, no filtering is applied.
     */
    public static Specification<WorkOrder> archivedEquals(Boolean archived) {
        return (root, query, cb) -> archived == null ? cb.conjunction() : cb.equal(root.get("archived"), archived);
    }

    /**
     * Convenience method to filter for non-archived work orders only.
     */
    public static Specification<WorkOrder> notArchived() {
        return (root, query, cb) -> cb.equal(root.get("archived"), false);
    }
}
