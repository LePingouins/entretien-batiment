package com.entretienbatiment.backend.modules.jobs.service;

import com.entretienbatiment.backend.modules.jobs.dto.JobStatusDto;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;

import java.time.*;
import java.util.*;
import java.util.concurrent.*;

@Service
public class JobService {

    // ─── Mutable state for a single job ───────────────────────────────────────
    public static class JobEntry {
        private final String id;
        private final String name;
        private final String description;
        private final String schedule;
        private final String cronExpr;

        private volatile boolean running = false;
        private volatile int progressPercent = 0;
        private volatile String status = "IDLE";
        private volatile Instant lastRunAt = null;
        private volatile String lastRunMessage = null;
        private volatile Instant nextRunAt = null;
        private volatile long lastBackupSizeBytes = 0;
        private final List<String> recentBackups = new CopyOnWriteArrayList<>();

        public JobEntry(String id, String name, String description, String schedule, String cronExpr) {
            this.id = id;
            this.name = name;
            this.description = description;
            this.schedule = schedule;
            this.cronExpr = cronExpr;
        }

        public String getId()                   { return id; }
        public String getName()                 { return name; }
        public String getDescription()          { return description; }
        public String getSchedule()             { return schedule; }
        public String getCronExpr()             { return cronExpr; }
        public boolean isRunning()              { return running; }
        public int getProgressPercent()         { return progressPercent; }
        public String getStatus()               { return status; }
        public Instant getLastRunAt()           { return lastRunAt; }
        public String getLastRunMessage()       { return lastRunMessage; }
        public Instant getNextRunAt()           { return nextRunAt; }
        public long getLastBackupSizeBytes()    { return lastBackupSizeBytes; }
        public List<String> getRecentBackups()  { return recentBackups; }

        public void setRunning(boolean v)               { this.running = v; }
        public void setProgressPercent(int v)           { this.progressPercent = v; }
        public void setStatus(String v)                 { this.status = v; }
        public void setLastRunAt(Instant v)             { this.lastRunAt = v; }
        public void setLastRunMessage(String v)         { this.lastRunMessage = v; }
        public void setNextRunAt(Instant v)             { this.nextRunAt = v; }
        public void setLastBackupSizeBytes(long v)      { this.lastBackupSizeBytes = v; }
        public void setRecentBackups(List<String> list) { recentBackups.clear(); recentBackups.addAll(list); }
    }

    // ─── Registry ─────────────────────────────────────────────────────────────
    private final Map<String, JobEntry>  registry = new LinkedHashMap<>();
    private final Map<String, Runnable>  handlers = new ConcurrentHashMap<>();

    public synchronized void register(String id, String name, String description,
                                      String schedule, String cronExpr) {
        JobEntry entry = new JobEntry(id, name, description, schedule, cronExpr);
        entry.setNextRunAt(computeNextRun(cronExpr));
        registry.put(id, entry);
    }

    public void registerHandler(String id, Runnable handler) {
        handlers.put(id, handler);
    }

    public List<JobStatusDto> listAll() {
        return registry.values().stream().map(this::toDto).toList();
    }

    public Optional<JobEntry> getEntry(String id) {
        return Optional.ofNullable(registry.get(id));
    }

    public void refreshNextRun(String id) {
        getEntry(id).ifPresent(e -> e.setNextRunAt(computeNextRun(e.getCronExpr())));
    }

    /**
     * Submits the job handler to a virtual-thread executor.
     * Returns false if the job is already running or unknown.
     */
    public boolean triggerAsync(String id) {
        JobEntry entry   = registry.get(id);
        Runnable handler = handlers.get(id);
        if (entry == null || handler == null || entry.isRunning()) return false;
        CompletableFuture.runAsync(handler);
        return true;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────
    private Instant computeNextRun(String cronExpr) {
        try {
            CronExpression cron = CronExpression.parse(cronExpr);
            LocalDateTime next  = cron.next(LocalDateTime.now(ZoneId.systemDefault()));
            return next != null ? next.atZone(ZoneId.systemDefault()).toInstant() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private JobStatusDto toDto(JobEntry e) {
        return new JobStatusDto(
                e.getId(), e.getName(), e.getDescription(), e.getSchedule(),
                e.isRunning(), e.getProgressPercent(), e.getStatus(),
                e.getLastRunAt(), e.getLastRunMessage(), e.getNextRunAt(),
                List.copyOf(e.getRecentBackups()), e.getLastBackupSizeBytes());
    }
}
