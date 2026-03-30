package com.entretienbatiment.backend.modules.dashboard.dto;

public record DashboardResponse(
    long totalWorkOrders,
    long activeWorkOrders,
    long urgentWorkOrders,
    long activeUrgentWorkOrders,
    long mileageEntries
) {}
