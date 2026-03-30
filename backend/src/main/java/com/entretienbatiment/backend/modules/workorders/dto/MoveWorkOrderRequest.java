package com.entretienbatiment.backend.modules.workorders.dto;

import com.entretienbatiment.backend.modules.workorders.model.WorkOrderStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Request DTO for moving a work order to a different status column at a specific index.
 * Used when dragging a card from one column to another.
 */
public record MoveWorkOrderRequest(
        @NotNull(message = "newStatus is required")
        WorkOrderStatus newStatus,

        @NotNull(message = "newIndex is required")
        @Min(value = 0, message = "newIndex must be >= 0")
        Integer newIndex
) {}
