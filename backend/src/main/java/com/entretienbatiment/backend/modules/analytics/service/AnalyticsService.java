package com.entretienbatiment.backend.modules.analytics.service;

import com.entretienbatiment.backend.modules.analytics.dto.AnalyticsStatsResponse;
import com.entretienbatiment.backend.modules.analytics.dto.TaskFrequency;
import com.entretienbatiment.backend.modules.analytics.dto.TechnicianStats;
import com.entretienbatiment.backend.modules.auth.model.AppUser;
import com.entretienbatiment.backend.modules.auth.repository.AppUserRepository;
import com.entretienbatiment.backend.modules.mileage.model.MileageEntry;
import com.entretienbatiment.backend.modules.mileage.repository.MileageEntryRepository;
import com.entretienbatiment.backend.modules.urgentworkorders.model.UrgentWorkOrder;
import com.entretienbatiment.backend.modules.urgentworkorders.repository.UrgentWorkOrderRepository;
import com.entretienbatiment.backend.modules.workorders.repository.WorkOrderRepository;
import com.entretienbatiment.backend.modules.workorders.model.WorkOrder;
import com.entretienbatiment.backend.modules.workorders.model.WorkOrderStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private final WorkOrderRepository workOrderRepo;
    private final UrgentWorkOrderRepository urgentWorkOrderRepo;
    private final MileageEntryRepository mileageRepo;
    private final AppUserRepository appUserRepo;

    public AnalyticsService(
            WorkOrderRepository workOrderRepo,
            UrgentWorkOrderRepository urgentWorkOrderRepo,
            MileageEntryRepository mileageRepo,
            AppUserRepository appUserRepo) {
        this.workOrderRepo = workOrderRepo;
        this.urgentWorkOrderRepo = urgentWorkOrderRepo;
        this.mileageRepo = mileageRepo;
        this.appUserRepo = appUserRepo;
    }

    @Transactional(readOnly = true)
    public AnalyticsStatsResponse getStats() {
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = LocalDate.now();
        ZoneId zoneId = ZoneId.systemDefault();

        // Time boundaries
        LocalDateTime startOfWeek = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).atStartOfDay();
        Instant startOfWeekInstant = startOfWeek.atZone(zoneId).toInstant();
        
        LocalDate startOfMonth = today.withDayOfMonth(1);
        LocalDateTime startOfMonthLDT = startOfMonth.atStartOfDay();
        Instant startOfMonthInstant = startOfMonth.atStartOfDay(zoneId).toInstant();

        List<WorkOrder> allWorkOrders = workOrderRepo.findAll();
        List<UrgentWorkOrder> allUrgentWorkOrders = urgentWorkOrderRepo.findAll();

        // --- 1. Basic Counts & Ratio ---
        long urgentCount = allUrgentWorkOrders.size();
        long normalCount = allWorkOrders.size();
        
        double urgentRatio = (urgentCount + normalCount) > 0 
                ? (double) urgentCount / (urgentCount + normalCount) 
                : 0.0;

        // --- 2. Completed Tasks (Weekly & Total) ---
        List<WorkOrder> completedNormalThisWeek = allWorkOrders.stream()
                .filter(wo -> wo.getStatus() == WorkOrderStatus.COMPLETED)
                .filter(wo -> wo.getUpdatedAt() != null && wo.getUpdatedAt().isAfter(startOfWeekInstant))
                .toList();
        long normalTasksCompletedThisWeek = completedNormalThisWeek.size();

        List<UrgentWorkOrder> completedUrgentThisWeek = allUrgentWorkOrders.stream()
                .filter(wo -> "COMPLETED".equalsIgnoreCase(wo.getStatus()))
                .filter(wo -> {
                    LocalDateTime completedAt = wo.getCompletedAt();
                    if (completedAt == null) completedAt = wo.getUpdatedAt();
                    return completedAt != null && completedAt.isAfter(startOfWeek);
                })
                .toList();
        long urgentTasksCompletedThisWeek = completedUrgentThisWeek.size();
        
        long tasksCompletedThisWeek = normalTasksCompletedThisWeek + urgentTasksCompletedThisWeek;

        // --- 3. Completion Rate ---
        long totalCompletedNormal = allWorkOrders.stream().filter(wo -> wo.getStatus() == WorkOrderStatus.COMPLETED).count();
        long totalCompletedUrgent = allUrgentWorkOrders.stream().filter(wo -> "COMPLETED".equalsIgnoreCase(wo.getStatus())).count();
        
        Double completionRate = (normalCount + urgentCount) > 0 
                ? (double) (totalCompletedNormal + totalCompletedUrgent) / (normalCount + urgentCount) * 100.0 
                : 0.0;

        // --- 4. Average Completion Time ---
        OptionalDouble avgTimeNormalOpt = allWorkOrders.stream()
                .filter(wo -> wo.getStatus() == WorkOrderStatus.COMPLETED && wo.getCreatedAt() != null && wo.getUpdatedAt() != null)
                .mapToLong(wo -> ChronoUnit.HOURS.between(wo.getCreatedAt(), wo.getUpdatedAt()))
                .average();
        Double averageCompletionTimeNormal = avgTimeNormalOpt.isPresent() ? avgTimeNormalOpt.getAsDouble() : 0.0;

        OptionalDouble avgTimeUrgentOpt = allUrgentWorkOrders.stream()
                .filter(wo -> "COMPLETED".equalsIgnoreCase(wo.getStatus()) && wo.getCreatedAt() != null)
                .mapToLong(wo -> {
                    LocalDateTime end = wo.getCompletedAt();
                    if (end == null) end = wo.getUpdatedAt();
                    return (end != null) ? ChronoUnit.HOURS.between(wo.getCreatedAt(), end) : 0;
                })
                .filter(h -> h >= 0)
                .average();
        Double averageCompletionTimeUrgent = avgTimeUrgentOpt.isPresent() ? avgTimeUrgentOpt.getAsDouble() : 0.0;
        
        long countNormalForAvg = allWorkOrders.stream().filter(wo -> wo.getStatus() == WorkOrderStatus.COMPLETED && wo.getCreatedAt() != null && wo.getUpdatedAt() != null).count();
        long countUrgentForAvg = allUrgentWorkOrders.stream().filter(wo -> "COMPLETED".equalsIgnoreCase(wo.getStatus()) && wo.getCreatedAt() != null).count();
        
        Double averageCompletionTimeHours = (countNormalForAvg + countUrgentForAvg) > 0 
                ? ((averageCompletionTimeNormal * countNormalForAvg) + (averageCompletionTimeUrgent * countUrgentForAvg)) / (countNormalForAvg + countUrgentForAvg)
                : 0.0;

        // --- 5. Overdue Tasks ---
        long overdueActiveNormal = allWorkOrders.stream()
                .filter(wo -> wo.getStatus() != WorkOrderStatus.COMPLETED && wo.getStatus() != WorkOrderStatus.CANCELLED)
                .filter(wo -> wo.getDueDate() != null && wo.getDueDate().isBefore(today))
                .count();

        long overdueActiveUrgent = allUrgentWorkOrders.stream()
                .filter(wo -> !"COMPLETED".equalsIgnoreCase(wo.getStatus()))
                .filter(wo -> wo.getDueDate() != null && wo.getDueDate().isBefore(now))
                .count();
        long overdueActiveTasks = overdueActiveNormal + overdueActiveUrgent;

        long overdueCompletedNormal = allWorkOrders.stream()
                .filter(wo -> wo.getStatus() == WorkOrderStatus.COMPLETED && wo.getDueDate() != null && wo.getUpdatedAt() != null)
                .filter(wo -> LocalDate.ofInstant(wo.getUpdatedAt(), zoneId).isAfter(wo.getDueDate()))
                .count();

        long overdueCompletedUrgent = allUrgentWorkOrders.stream()
                .filter(wo -> "COMPLETED".equalsIgnoreCase(wo.getStatus()) && wo.getDueDate() != null)
                .filter(wo -> {
                    LocalDateTime end = wo.getCompletedAt();
                    if (end == null) end = wo.getUpdatedAt();
                    return end != null && end.isAfter(wo.getDueDate());
                })
                .count();
        long overdueCompletedTasks = overdueCompletedNormal + overdueCompletedUrgent;

        // --- 6. Task Volume ---
        long tasksCreatedThisWeek = allWorkOrders.stream()
                .filter(wo -> isAfter(wo.getCreatedAt(), startOfWeekInstant))
                .count()
                                   + allUrgentWorkOrders.stream()
                .filter(wo -> isAfter(wo.getCreatedAt(), startOfWeek))
                .count();

        long tasksCreatedThisMonth = allWorkOrders.stream()
                .filter(wo -> isAfter(wo.getCreatedAt(), startOfMonthInstant))
                .count()
                                   + allUrgentWorkOrders.stream()
                .filter(wo -> isAfter(wo.getCreatedAt(), startOfMonthLDT))
                .count();

        long tasksCancelledThisWeek = allWorkOrders.stream()
                .filter(wo -> wo.getStatus() == WorkOrderStatus.CANCELLED && isAfter(wo.getUpdatedAt(), startOfWeekInstant))
                .count();

        long tasksCancelledThisMonth = allWorkOrders.stream()
                .filter(wo -> wo.getStatus() == WorkOrderStatus.CANCELLED && isAfter(wo.getUpdatedAt(), startOfMonthInstant))
                .count();

        // --- 7. Status Distribution ---
        Map<String, Long> activeTasksByStatus = allWorkOrders.stream()
                .filter(wo -> wo.getStatus() != null)
                .filter(wo -> wo.getStatus() != WorkOrderStatus.COMPLETED && wo.getStatus() != WorkOrderStatus.CANCELLED)
                .collect(Collectors.groupingBy(wo -> wo.getStatus().name(), Collectors.counting()));
        
        long activeUrgent = allUrgentWorkOrders.stream().filter(wo -> !"COMPLETED".equalsIgnoreCase(wo.getStatus())).count();
        if (activeUrgent > 0) activeTasksByStatus.put("URGENT", activeUrgent);

        // --- 8. Mileage ---
        List<MileageEntry> monthMileage = mileageRepo.findAll().stream()
                .filter(m -> m.getDate() != null && !m.getDate().isBefore(startOfMonth))
                .toList();

        long totalMileageThisMonth = monthMileage.stream()
                .mapToLong(m -> m.getTotalKm() != null ? m.getTotalKm() : 0)
                .sum();
                
        long completedTasksThisMonth = allWorkOrders.stream()
                                .filter(wo -> wo.getStatus() == WorkOrderStatus.COMPLETED && isAfter(wo.getUpdatedAt(), startOfMonthInstant)).count() 
                + allUrgentWorkOrders.stream()
                                .filter(wo -> {
                                        if (!"COMPLETED".equalsIgnoreCase(wo.getStatus())) {
                                                return false;
                                        }
                                        LocalDateTime end = wo.getCompletedAt() != null ? wo.getCompletedAt() : wo.getUpdatedAt();
                                        return isAfter(end, startOfMonthLDT);
                                })
                                .count();
                
        Double averageMileagePerTask = completedTasksThisMonth > 0 ? (double) totalMileageThisMonth / completedTasksThisMonth : 0.0;

        // --- 9. Top Technicians ---
        Map<Long, Long> techCompletedCounts = new HashMap<>();
        allWorkOrders.stream()
                .filter(wo -> wo.getStatus() == WorkOrderStatus.COMPLETED && wo.getAssignedTo() != null)
                .forEach(wo -> techCompletedCounts.merge(wo.getAssignedTo().getId(), 1L, Long::sum));
        allUrgentWorkOrders.stream()
                .filter(wo -> "COMPLETED".equalsIgnoreCase(wo.getStatus()) && wo.getAssignedToUserId() != null)
                .forEach(wo -> techCompletedCounts.merge(wo.getAssignedToUserId(), 1L, Long::sum));

        List<TechnicianStats> topTechnicians = techCompletedCounts.entrySet().stream()
                .sorted(Map.Entry.<Long, Long>comparingByValue().reversed())
                .limit(5)
                .map(entry -> {
                    String name = appUserRepo.findById(entry.getKey()).map(AppUser::getEmail).orElse("User " + entry.getKey());
                    return new TechnicianStats(entry.getKey(), name, entry.getValue());
                })
                .collect(Collectors.toList());

        // --- 10. Avg Tasks/Day (30 Days) ---
        LocalDateTime thirtyDaysAgo = now.minusDays(30);
        Instant thirtyDaysAgoInstant = thirtyDaysAgo.atZone(zoneId).toInstant();
        
        long completedLast30d = allWorkOrders.stream()
                                .filter(wo -> wo.getStatus() == WorkOrderStatus.COMPLETED && isAfter(wo.getUpdatedAt(), thirtyDaysAgoInstant)).count()
                + allUrgentWorkOrders.stream()
                                .filter(wo -> {
                                        if (!"COMPLETED".equalsIgnoreCase(wo.getStatus())) {
                                                return false;
                                        }
                                        LocalDateTime end = wo.getCompletedAt() != null ? wo.getCompletedAt() : wo.getUpdatedAt();
                                        return isAfter(end, thirtyDaysAgo);
                                })
                                .count();

        Double averageTasksPerDay = completedLast30d / 30.0;

        // --- 11. Task Frequency (Last 365 Days) ---
        LocalDateTime oneYearAgo = now.minusYears(1);
        Instant oneYearAgoInstant = oneYearAgo.atZone(zoneId).toInstant();

        Map<String, Long> taskFrequencyMap = new HashMap<>();

        // Process Normal Work Orders
        allWorkOrders.stream()
            .filter(wo -> wo.getStatus() == WorkOrderStatus.COMPLETED && wo.getUpdatedAt() != null && wo.getUpdatedAt().isAfter(oneYearAgoInstant))
            .filter(wo -> wo.getTitle() != null && !wo.getTitle().isBlank())
            .forEach(wo -> {
                 String normalized = wo.getTitle().trim().toLowerCase();
                 normalized = normalized.replaceAll("[^a-zA-Z0-9\\s]", " ").trim();
                 normalized = normalized.replaceAll("\\s+", " ");
                 if (!normalized.isBlank()) {
                     taskFrequencyMap.merge(normalized, 1L, Long::sum);
                 }
            });

        // Process Urgent Work Orders
        allUrgentWorkOrders.stream()
            .filter(wo -> "COMPLETED".equalsIgnoreCase(wo.getStatus()))
            .filter(wo -> {
                 LocalDateTime completedAt = wo.getCompletedAt();
                 if (completedAt == null) completedAt = wo.getUpdatedAt();
                 return completedAt != null && completedAt.isAfter(oneYearAgo);
            })
            .filter(wo -> wo.getTitle() != null && !wo.getTitle().isBlank())
            .forEach(wo -> {
                 String normalized = wo.getTitle().trim().toLowerCase();
                 normalized = normalized.replaceAll("[^a-zA-Z0-9\\s]", " ").trim();
                 normalized = normalized.replaceAll("\\s+", " ");
                 if (!normalized.isBlank()) {
                     taskFrequencyMap.merge(normalized, 1L, Long::sum);
                 }
            });

        List<TaskFrequency> taskFrequencies = taskFrequencyMap.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(20) 
                .map(entry -> new TaskFrequency(entry.getKey(), entry.getValue()))
                .collect(Collectors.toList());

        return new AnalyticsStatsResponse(
            tasksCompletedThisWeek,
            urgentTasksCompletedThisWeek,
            normalTasksCompletedThisWeek,
            completionRate,
            averageCompletionTimeHours,
            averageCompletionTimeUrgent,
            averageCompletionTimeNormal,
            totalMileageThisMonth,
            urgentCount,
            normalCount,
            urgentRatio,
            overdueCompletedTasks,
            overdueActiveTasks,
            tasksCreatedThisWeek,
            tasksCreatedThisMonth,
            tasksCancelledThisWeek,
            tasksCancelledThisMonth,
            activeTasksByStatus,
            averageMileagePerTask,
            topTechnicians,
            averageTasksPerDay,
            taskFrequencies
        );
    }

        private boolean isAfter(Instant value, Instant boundary) {
                return value != null && boundary != null && value.isAfter(boundary);
        }

        private boolean isAfter(LocalDateTime value, LocalDateTime boundary) {
                return value != null && boundary != null && value.isAfter(boundary);
        }
}
