package com.entretienbatiment.backend.analytics.web.dto;

public record TechnicianStats(
    Long userId,
    String name,
    Long completedTasks
) {}
