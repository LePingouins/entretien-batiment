package com.entretienbatiment.backend.modules.urgentworkorders.service;

import com.entretienbatiment.backend.modules.urgentworkorders.model.UrgentWorkOrder;
import org.springframework.data.jpa.domain.Specification;

public class UrgentWorkOrderSpecifications {
    public static Specification<UrgentWorkOrder> archivedEquals(Boolean archived) {
        return (root, query, cb) -> archived == null ? cb.conjunction() : cb.equal(root.get("archived"), archived);
    }

    public static Specification<UrgentWorkOrder> statusEquals(String status) {
        return (root, query, cb) -> status == null ? cb.conjunction() : cb.equal(root.get("status"), status);
    }

    public static Specification<UrgentWorkOrder> locationEquals(String location) {
        return (root, query, cb) -> location == null ? cb.conjunction() : cb.equal(root.get("location"), location);
    }

    public static Specification<UrgentWorkOrder> assignedToUserIdEquals(Long assignedToUserId) {
        return (root, query, cb) -> assignedToUserId == null ? cb.conjunction() : cb.equal(root.get("assignedToUserId"), assignedToUserId);
    }

    public static Specification<UrgentWorkOrder> textOrIdSearch(String q) {
        if (q == null || q.isBlank()) return (root, query, cb) -> cb.conjunction();
        String like = "%" + q.trim().toLowerCase() + "%";
        boolean isNumeric = q.trim().matches("\\d+");
        return (root, query, cb) -> {
            if (isNumeric) {
                return cb.or(
                    cb.equal(root.get("id"), Long.valueOf(q.trim())),
                    cb.like(cb.lower(root.get("title")), like),
                    cb.like(cb.lower(root.get("description")), like),
                    cb.like(cb.lower(root.get("location")), like)
                );
            } else {
                return cb.or(
                    cb.like(cb.lower(root.get("title")), like),
                    cb.like(cb.lower(root.get("description")), like),
                    cb.like(cb.lower(root.get("location")), like)
                );
            }
        };
    }
}
