package com.entretienbatiment.backend.modules.projectboard.service;

import com.entretienbatiment.backend.modules.projectboard.model.ProjectBoardTask;
import org.springframework.data.jpa.domain.Specification;

public class ProjectBoardSpecifications {
    public static Specification<ProjectBoardTask> archivedEquals(Boolean archived) {
        return (root, query, cb) -> archived == null ? cb.conjunction() : cb.equal(root.get("archived"), archived);
    }

    public static Specification<ProjectBoardTask> statusEquals(String status) {
        return (root, query, cb) -> status == null ? cb.conjunction() : cb.equal(root.get("status"), status);
    }

    public static Specification<ProjectBoardTask> locationEquals(String location) {
        return (root, query, cb) -> location == null ? cb.conjunction() : cb.equal(root.get("location"), location);
    }

    public static Specification<ProjectBoardTask> assignedToUserIdEquals(Long assignedToUserId) {
        return (root, query, cb) -> assignedToUserId == null ? cb.conjunction() : cb.equal(root.get("assignedToUserId"), assignedToUserId);
    }

    public static Specification<ProjectBoardTask> textOrIdSearch(String q) {
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
