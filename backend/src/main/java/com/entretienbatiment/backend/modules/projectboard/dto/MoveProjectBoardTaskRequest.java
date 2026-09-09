package com.entretienbatiment.backend.modules.projectboard.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Request DTO for moving a project board task to a different status column at a specific index. */
public record MoveProjectBoardTaskRequest(
        @NotBlank(message = "newStatus is required")
        String newStatus,

        @NotNull(message = "newIndex is required")
        @Min(value = 0, message = "newIndex must be >= 0")
        Integer newIndex
) {}
