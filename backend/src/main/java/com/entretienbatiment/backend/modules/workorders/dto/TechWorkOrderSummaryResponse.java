package com.entretienbatiment.backend.modules.workorders.dto;

public record TechWorkOrderSummaryResponse(
        long assigned,
        long inProgress,
        long completed
) {}
