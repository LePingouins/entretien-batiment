package com.entretienbatiment.backend.mileage;

import org.springframework.data.jpa.domain.Specification;

public class MileageEntrySpecifications {
    public static Specification<MileageEntry> archivedEquals(Boolean archived) {
        return (root, query, cb) -> archived == null ? cb.conjunction() : cb.equal(root.get("archived"), archived);
    }

    public static Specification<MileageEntry> supplierLike(String q) {
        return (root, query, cb) -> {
            if (q == null || q.isBlank()) return cb.conjunction();
            String like = "%" + q.trim().toLowerCase() + "%";
            return cb.like(cb.lower(root.get("supplier")), like);
        };
    }

    public static Specification<MileageEntry> idEquals(String q) {
        return (root, query, cb) -> {
            if (q == null || !q.trim().matches("\\d+")) return cb.disjunction();
            return cb.equal(root.get("id"), Long.valueOf(q.trim()));
        };
    }

    public static Specification<MileageEntry> dateAfter(java.time.LocalDate startDate) {
        return (root, query, cb) -> startDate == null ? cb.conjunction() : cb.greaterThanOrEqualTo(root.get("date"), startDate);
    }

    public static Specification<MileageEntry> dateBefore(java.time.LocalDate endDate) {
        return (root, query, cb) -> endDate == null ? cb.conjunction() : cb.lessThanOrEqualTo(root.get("date"), endDate);
    }

    public static Specification<MileageEntry> textOrIdSearch(String q) {
        if (q == null || q.isBlank()) return (root, query, cb) -> cb.conjunction();
        String like = "%" + q.trim().toLowerCase() + "%";
        boolean isNumeric = q.trim().matches("\\d+");
        return (root, query, cb) -> {
            if (isNumeric) {
                return cb.or(
                    cb.equal(root.get("id"), Long.valueOf(q.trim())),
                    cb.like(cb.lower(root.get("supplier")), like)
                );
            } else {
                return cb.like(cb.lower(root.get("supplier")), like);
            }
        };
    }
}
