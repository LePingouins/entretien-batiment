package com.entretienbatiment.backend.workorders.web.tech.dto;

public record TechWorkOrderSummaryResponse(
        long assigned,
        long inProgress,
        long completed
) {}
