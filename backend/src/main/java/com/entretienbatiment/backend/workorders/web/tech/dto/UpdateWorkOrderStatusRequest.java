package com.entretienbatiment.backend.workorders.web.tech.dto;

import com.entretienbatiment.backend.workorders.domain.WorkOrderStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateWorkOrderStatusRequest(
        @NotNull WorkOrderStatus status
) {}
