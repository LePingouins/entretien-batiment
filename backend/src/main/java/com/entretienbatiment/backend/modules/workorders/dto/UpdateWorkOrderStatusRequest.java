package com.entretienbatiment.backend.modules.workorders.dto;

import com.entretienbatiment.backend.modules.workorders.model.WorkOrderStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateWorkOrderStatusRequest(
        @NotNull WorkOrderStatus status
) {}
