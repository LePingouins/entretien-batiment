package com.entretienbatiment.backend.modules.workorders.service;

import com.entretienbatiment.backend.modules.auth.model.AppUser;
import com.entretienbatiment.backend.modules.auth.repository.AppUserRepository;
import com.entretienbatiment.backend.modules.notifications.service.NotificationService;
import com.entretienbatiment.backend.modules.urgentworkorders.model.UrgentWorkOrder;
import com.entretienbatiment.backend.modules.urgentworkorders.repository.UrgentWorkOrderRepository;
import com.entretienbatiment.backend.modules.workorders.repository.WorkOrderRepository;
import com.entretienbatiment.backend.modules.workorders.model.WorkOrder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
public class WorkOrderReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(WorkOrderReminderScheduler.class);

    private final WorkOrderRepository workOrderRepo;
    private final UrgentWorkOrderRepository uwoRepo;
    private final AppUserRepository userRepo;
    private final NotificationService notificationService;

    public WorkOrderReminderScheduler(
            WorkOrderRepository workOrderRepo,
            UrgentWorkOrderRepository uwoRepo,
            AppUserRepository userRepo,
            NotificationService notificationService
    ) {
        this.workOrderRepo = workOrderRepo;
        this.uwoRepo = uwoRepo;
        this.userRepo = userRepo;
        this.notificationService = notificationService;
    }

    @Scheduled(cron = "0 0 8 * * ?")
    public void generateDailyReminders() {
        log.info("Running daily work order reminder scheduler...");
        LocalDate tomorrow = LocalDate.now().plusDays(1);

        // Regular Work Orders
        List<WorkOrder> regularOrders = workOrderRepo.findAll().stream()
                .filter(w -> w.getArchivedAt() == null)
                .filter(w -> !"COMPLETED".equalsIgnoreCase(w.getStatus().name()) && !"CANCELLED".equalsIgnoreCase(w.getStatus().name()))
                .filter(w -> w.getDueDate() != null && w.getDueDate().equals(tomorrow))
                .toList();

        for (WorkOrder wo : regularOrders) {
            AppUser assignedTo = wo.getAssignedTo();
            AppUser creator = wo.getCreatedBy();
            String title = "REMINDER_TOMORROW";
            String message = "The work order '" + wo.getTitle() + "' is due tomorrow.";
            if (assignedTo != null && assignedTo.isGetReminders() && assignedTo.isEnabled()) {
                String href = workOrderHref(assignedTo, wo.getId());
                notificationService.notifyUser(assignedTo.getId(), title, message, href, "REMINDER");
            }
            if (creator != null && creator.isGetReminders() && creator.isEnabled() && (assignedTo == null || !creator.getId().equals(assignedTo.getId()))) {
                String href = workOrderHref(creator, wo.getId());
                notificationService.notifyUser(creator.getId(), title, message, href, "REMINDER");
            }
        }

        // Urgent Work Orders
        List<UrgentWorkOrder> urgentOrders = uwoRepo.findAll().stream()
                .filter(w -> w.getArchivedAt() == null)
                .filter(w -> !"COMPLETED".equalsIgnoreCase(w.getStatus()) && !"CANCELLED".equalsIgnoreCase(w.getStatus()))
                .filter(w -> w.getDueDate() != null && w.getDueDate().toLocalDate().equals(tomorrow))
                .toList();

        for (UrgentWorkOrder uwo : urgentOrders) {
            Long assignedToUserId = uwo.getAssignedToUserId();
            Long creatorUserId = uwo.getCreatedByUserId();
            String title = "REMINDER_TOMORROW";
            String message = "The urgent work order '" + uwo.getTitle() + "' is due tomorrow.";
            if (assignedToUserId != null) {
                userRepo.findById(assignedToUserId).ifPresent(user -> {
                    if (user.isGetReminders() && user.isEnabled()) {
                        String href = urgentWorkOrderHref(user, uwo.getId());
                        notificationService.notifyUser(user.getId(), title, message, href, "REMINDER");
                    }
                });
            }
            if (creatorUserId != null && (assignedToUserId == null || !creatorUserId.equals(assignedToUserId))) {
                userRepo.findById(creatorUserId).ifPresent(user -> {
                    if (user.isGetReminders() && user.isEnabled()) {
                        String href = urgentWorkOrderHref(user, uwo.getId());
                        notificationService.notifyUser(user.getId(), title, message, href, "REMINDER");
                    }
                });
            }
        }
        
        log.info("Finished running daily work order reminder scheduler.");
    }

    public void checkAndSendReminder(WorkOrder wo) {
        if (wo.getArchivedAt() != null) return;
        if ("COMPLETED".equalsIgnoreCase(wo.getStatus().name()) || "CANCELLED".equalsIgnoreCase(wo.getStatus().name())) return;
        if (wo.getDueDate() == null) return;

        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);

        if (wo.getDueDate().equals(today) || wo.getDueDate().equals(tomorrow)) {
            AppUser assignedTo = wo.getAssignedTo();
            AppUser creator = wo.getCreatedBy();
            String title = wo.getDueDate().equals(today) ? "REMINDER_TODAY" : "REMINDER_TOMORROW";
            String message = "The work order '" + wo.getTitle() + "' is due " + (wo.getDueDate().equals(today) ? "today." : "tomorrow.");
            if (assignedTo != null && assignedTo.isGetReminders() && assignedTo.isEnabled()) {
                String href = workOrderHref(assignedTo, wo.getId());
                notificationService.notifyUser(assignedTo.getId(), title, message, href, "REMINDER");
            }
            if (creator != null && creator.isGetReminders() && creator.isEnabled() && (assignedTo == null || !creator.getId().equals(assignedTo.getId()))) {
                String href = workOrderHref(creator, wo.getId());
                notificationService.notifyUser(creator.getId(), title, message, href, "REMINDER");
            }
        }
    }

    public void checkAndSendReminder(UrgentWorkOrder uwo) {
        if (uwo.getArchivedAt() != null) return;
        if ("COMPLETED".equalsIgnoreCase(uwo.getStatus()) || "CANCELLED".equalsIgnoreCase(uwo.getStatus())) return;
        if (uwo.getDueDate() == null) return;

        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);
        LocalDate dueDateLocal = uwo.getDueDate().toLocalDate();

        if (dueDateLocal.equals(today) || dueDateLocal.equals(tomorrow)) {
            Long assignedToUserId = uwo.getAssignedToUserId();
            Long creatorUserId = uwo.getCreatedByUserId();
            String title = dueDateLocal.equals(today) ? "REMINDER_TODAY" : "REMINDER_TOMORROW";
            String message = "The urgent work order '" + uwo.getTitle() + "' is due " + (dueDateLocal.equals(today) ? "today." : "tomorrow.");
            if (assignedToUserId != null) {
                userRepo.findById(assignedToUserId).ifPresent(user -> {
                    if (user.isGetReminders() && user.isEnabled()) {
                        String href = urgentWorkOrderHref(user, uwo.getId());
                        notificationService.notifyUser(user.getId(), title, message, href, "REMINDER");
                    }
                });
            }
            if (creatorUserId != null && (assignedToUserId == null || !creatorUserId.equals(assignedToUserId))) {
                userRepo.findById(creatorUserId).ifPresent(user -> {
                    if (user.isGetReminders() && user.isEnabled()) {
                        String href = urgentWorkOrderHref(user, uwo.getId());
                        notificationService.notifyUser(user.getId(), title, message, href, "REMINDER");
                    }
                });
            }
        }
    }

    private String basePath(AppUser user) {
        if (user == null || user.getRole() == null) {
            return "/tech";
        }

        return switch (user.getRole()) {
            case ADMIN -> "/admin";
            case DEVELOPPER -> "/admin";
            case WORKER -> "/worker";
            default -> "/tech";
        };
    }

    private String workOrderHref(AppUser user, Long workOrderId) {
        return basePath(user) + "/work-orders/" + workOrderId;
    }

    private String urgentWorkOrderHref(AppUser user, Long urgentWorkOrderId) {
        return basePath(user) + "/urgent-work-orders/" + urgentWorkOrderId;
    }
}
