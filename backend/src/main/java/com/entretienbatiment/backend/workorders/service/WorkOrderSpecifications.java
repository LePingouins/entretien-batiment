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
}
