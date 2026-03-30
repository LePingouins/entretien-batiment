package com.entretienbatiment.backend.modules.analytics.dto;

import java.util.List;
import java.util.Map;

public record AnalyticsStatsResponse(
    long tasksCompletedThisWeek,
    long urgentTasksCompletedThisWeek,
    long normalTasksCompletedThisWeek,
    Double completionRate,
    Double averageCompletionTimeHours,
    Double averageCompletionTimeUrgent,
    Double averageCompletionTimeNormal,
    long totalMileageThisMonth,
    long urgentCount,
    long normalCount,
    Double urgentRatio,
    long overdueCompletedTasks,
    long overdueActiveTasks,
    long tasksCreatedThisWeek,
    long tasksCreatedThisMonth,
    long tasksCancelledThisWeek,
    long tasksCancelledThisMonth,
    Map<String, Long> activeTasksByStatus,
    Double averageMileagePerTask,
    List<TechnicianStats> topTechnicians,
    Double averageTasksPerDay,
    List<TaskFrequency> taskFrequencies
) {}
