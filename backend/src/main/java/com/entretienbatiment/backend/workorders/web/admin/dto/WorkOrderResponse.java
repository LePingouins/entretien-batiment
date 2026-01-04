package com.entretienbatiment.backend.workorders.web.admin.dto;

import com.entretienbatiment.backend.workorders.domain.WorkOrderPriority;
import com.entretienbatiment.backend.workorders.domain.WorkOrderStatus;

import java.time.Instant;
import java.time.LocalDate;

public record WorkOrderResponse(
        Long id,
        String title,
        String description,
        String location,
        WorkOrderPriority priority,
        WorkOrderStatus status,

        Long createdByUserId,
        Long assignedToUserId,

        LocalDate requestedDate,
        LocalDate dueDate,

        Instant createdAt,
        Instant updatedAt
) {}
