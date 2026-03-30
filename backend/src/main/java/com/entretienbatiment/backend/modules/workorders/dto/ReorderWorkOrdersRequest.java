package com.entretienbatiment.backend.modules.workorders.dto;

import com.entretienbatiment.backend.modules.workorders.model.WorkOrderStatus;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Request DTO for reordering work orders within a single status column.
 * Used when dragging a card within the same column.
 * The orderedIds list specifies the new order; sort_index will be set to the array index.
 */
public record ReorderWorkOrdersRequest(
        @NotNull(message = "status is required")
        WorkOrderStatus status,

        @NotEmpty(message = "orderedIds must not be empty")
        List<Long> orderedIds
) {}
