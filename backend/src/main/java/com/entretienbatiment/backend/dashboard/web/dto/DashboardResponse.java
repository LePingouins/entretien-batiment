package com.entretienbatiment.backend.dashboard.web.dto;

public record DashboardResponse(
    long totalWorkOrders,
    long activeWorkOrders,
    long urgentWorkOrders,
    long activeUrgentWorkOrders,
    long mileageEntries
) {}
