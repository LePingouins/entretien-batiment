package com.entretienbatiment.backend.modules.projectboard.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/** Request DTO for reordering project board tasks within a single status column. */
public record ReorderProjectBoardTasksRequest(
        @NotBlank(message = "status is required")
        String status,

        @NotEmpty(message = "orderedIds must not be empty")
        List<Long> orderedIds
) {}
