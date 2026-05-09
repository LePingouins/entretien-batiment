package com.entretienbatiment.backend.modules.jobs.service;

import com.entretienbatiment.backend.modules.mileage.model.MileageEntry;
import com.entretienbatiment.backend.modules.mileage.repository.MileageEntryRepository;
import com.entretienbatiment.backend.modules.urgentworkorders.service.UrgentWorkOrderService;
import com.entretienbatiment.backend.modules.workorders.service.WorkOrderService;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Quarterly archive job — archives all completed/cancelled work orders and
 * urgent work orders. Mileage entries older than 3 months are archived only
 * on the quarterly scheduled run (no "completed" status to gate a manual run).
 *
 * Runs automatically on the 1st of January, April, July, and October at midnight.
 * Can also be triggered manually from the Dev Insights → Jobs tab (WOs + urgent WOs only).
 */
@Component
public class ArchiveJob {

    private static final String JOB_ID = "quarterly-archive";
    private static final String CRON   = "0 0 0 1 1,4,7,10 *"; // 1st of Jan, Apr, Jul, Oct

    @Autowired private JobService              jobService;
    @Autowired private WorkOrderService        workOrderService;
    @Autowired private UrgentWorkOrderService  urgentWorkOrderService;
    @Autowired private MileageEntryRepository  mileageRepository;

    // ─── Registration ─────────────────────────────────────────────────────────

    @PostConstruct
    public void init() {
        jobService.register(
                JOB_ID,
                "Quarterly Archive",
                "Archives all completed/cancelled work orders and urgent work orders. "
                        + "Mileage entries older than 3 months are archived automatically each quarter. "
                        + "Runs on the 1st of Jan, Apr, Jul & Oct.",
                "Quarterly (Jan · Apr · Jul · Oct)",
                CRON);
        jobService.registerHandler(JOB_ID, this::doRun);
    }

    // ─── Scheduler hook ───────────────────────────────────────────────────────

    @Scheduled(cron = CRON)
    public void scheduledRun() {
        doRun();
        archiveMileage();
        jobService.refreshNextRun(JOB_ID);
    }

    // ─── Core logic (manual "Run Now" + scheduled WO/urgent archiving) ────────

    public void doRun() {
        JobService.JobEntry state = jobService.getEntry(JOB_ID).orElse(null);
        if (state == null || state.isRunning()) return;

        state.setRunning(true);
        state.setStatus("RUNNING");
        state.setProgressPercent(0);
        state.setLastRunAt(Instant.now());
        state.setLastRunMessage("Archiving work orders…");

        int woCount = 0;
        int urgentCount = 0;

        try {
            // 1. Work Orders (all completed / cancelled — the quarterly schedule is the age-gate)
            woCount = workOrderService.archiveWorkOrdersBefore(Instant.now());
            state.setProgressPercent(50);
            state.setLastRunMessage("Archiving urgent work orders…");

            // 2. Urgent Work Orders (all completed / cancelled)
            urgentCount = urgentWorkOrderService.archiveOldUrgentWorkOrders(LocalDateTime.now());
            state.setProgressPercent(100);

            state.setStatus("SUCCESS");
            state.setLastRunMessage(
                    "✓ Archived: " + woCount + " work order" + (woCount != 1 ? "s" : "")
                    + ", " + urgentCount + " urgent WO" + (urgentCount != 1 ? "s" : ""));

        } catch (Exception e) {
            state.setStatus("FAILED");
            state.setProgressPercent(0);
            state.setLastRunMessage("Error: " + e.getMessage());
        } finally {
            state.setRunning(false);
        }
    }

    // ─── Mileage archiving (quarterly schedule only) ──────────────────────────

    private void archiveMileage() {
        try {
            LocalDate mileageCutoff = LocalDate.now().minus(3, ChronoUnit.MONTHS);
            List<MileageEntry> toArchive = mileageRepository.findMileageEntriesToArchive(mileageCutoff);
            LocalDateTime now = LocalDateTime.now();
            for (MileageEntry m : toArchive) {
                m.setArchived(true);
                m.setArchivedAt(now);
            }
            if (!toArchive.isEmpty()) {
                mileageRepository.saveAll(toArchive);
            }
        } catch (Exception e) {
            // Log but don't surface — mileage archiving is a background concern
        }
    }
}
