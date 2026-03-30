package com.entretienbatiment.backend.modules.workorders.dto;

import com.entretienbatiment.backend.modules.workorders.model.WorkOrderPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateWorkOrderRequest(
        @NotBlank @Size(max = 140)
        String title,

        @Size(max = 4000)
        String description,

        @Size(max = 200)
        String location,

        WorkOrderPriority priority,

        LocalDate requestedDate,
        LocalDate dueDate,
        Long assignedToUserId
) {}
