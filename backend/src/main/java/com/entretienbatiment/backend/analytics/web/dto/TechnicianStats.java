package com.entretienbatiment.backend.analytics.web.dto;

import java.util.List;

public record TechnicianStats(
    Long userId,
    String name,
    Long completedTasks
) {}
