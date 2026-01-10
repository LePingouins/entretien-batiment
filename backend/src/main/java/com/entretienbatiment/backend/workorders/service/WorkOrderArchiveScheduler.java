package com.entretienbatiment.backend.workorders.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled task to automatically archive old work orders.
 * TODO: Change back to daily (cron = "0 0 2 * * *") for production.
 * Currently runs every minute for testing.
 */
@Component
public class WorkOrderArchiveScheduler {

    private static final Logger log = LoggerFactory.getLogger(WorkOrderArchiveScheduler.class);

    private final WorkOrderService workOrderService;

    public WorkOrderArchiveScheduler(WorkOrderService workOrderService) {
        this.workOrderService = workOrderService;
    }

    /**
     * Run every minute to archive old completed/cancelled work orders (for testing).
     * TODO: Change back to "0 0 2 * * *" (daily at 2 AM) for production.
     */
    @Scheduled(fixedRate = 60000)
    public void archiveOldWorkOrders() {
        log.info("Starting scheduled work order archiving...");
        try {
            int archivedCount = workOrderService.archiveOldWorkOrders();
            log.info("Archived {} work orders", archivedCount);
        } catch (Exception e) {
            log.error("Failed to archive work orders", e);
        }
    }
}
