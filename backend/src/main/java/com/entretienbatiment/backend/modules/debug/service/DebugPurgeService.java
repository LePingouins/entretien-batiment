package com.entretienbatiment.backend.modules.debug.service;

import com.entretienbatiment.backend.modules.debug.repository.DebugErrorLogRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class DebugPurgeService {

    private final DebugErrorLogRepository repository;

    // retention days for debug_error_log; default 90 days
    private final int retentionDays;

    public DebugPurgeService(DebugErrorLogRepository repository, @Value("${app.debug.retention-days:90}") int retentionDays) {
        this.repository = repository;
        this.retentionDays = retentionDays;
    }

    // Run daily at 03:30
    @org.springframework.transaction.annotation.Transactional
    @Scheduled(cron = "0 30 3 * * *")
    public void purgeOldDebugLogs() {
        try {
            Instant cutoff = Instant.now().minusSeconds((long) retentionDays * 24 * 3600);
            repository.deleteOlderThan(cutoff);
        } catch (Exception ignored) {
        }
    }
}
