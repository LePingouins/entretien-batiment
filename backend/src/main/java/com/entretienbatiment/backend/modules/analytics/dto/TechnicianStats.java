package com.entretienbatiment.backend.modules.analytics.dto;

public record TechnicianStats(
    Long userId,
    String name,
    Long completedTasks
) {}
