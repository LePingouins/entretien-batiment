package com.entretienbatiment.backend.modules.jobs.dto;

import java.time.Instant;
import java.util.List;

public record JobStatusDto(
        String id,
        String name,
        String description,
        String schedule,
        boolean running,
        int progressPercent,
        String status,
        Instant lastRunAt,
        String lastRunMessage,
        Instant nextRunAt,
        List<String> recentBackups,
        long lastBackupSizeBytes) {
}
