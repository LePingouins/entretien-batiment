package com.entretienbatiment.backend.modules.jobs.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.*;
import java.nio.file.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.zip.GZIPOutputStream;

/**
 * Scheduled daily backup of the PostgreSQL database via {@code docker exec}.
 *
 * The dump is compressed with gzip and saved to {@code uploads/backups/}.
 * Files older than {@code app.backup.retention-days} days are auto-deleted
 * after each successful run.
 *
 * <p>Prerequisites on the host running the Spring Boot application:
 * <ul>
 *   <li>Docker CLI must be available in {@code PATH}.</li>
 *   <li>The container name must match {@code app.backup.db-container}
 *       (default: {@code entretien-db}).</li>
 * </ul>
 */
@Component
public class PgDumpJob {

    private static final String JOB_ID = "pg-dump";
    private static final String CRON   = "0 0 2 * * *"; // Every day at 02:00

    @Value("${app.backup.dir:uploads/backups}")
    private String backupDir;

    @Value("${app.backup.db-container:entretien-db}")
    private String dbContainer;

    @Value("${spring.datasource.username:entretien_user}")
    private String dbUser;

    @Value("${spring.datasource.password:entretien_pass}")
    private String dbPassword;

    @Value("${app.backup.db-name:entretien}")
    private String dbName;

    @Value("${app.backup.retention-days:30}")
    private int retentionDays;

    @Autowired
    private JobService jobService;

    // ─── Registration ─────────────────────────────────────────────────────────

    @PostConstruct
    public void init() {
        jobService.register(
                JOB_ID,
                "Database Backup",
                "Nightly pg_dump via docker exec, compressed (.sql.gz), saved to "
                        + backupDir + ". Files older than " + retentionDays + " days are auto-deleted.",
                "Daily at 02:00 AM",
                CRON);
        jobService.registerHandler(JOB_ID, this::doRun);
        refreshRecentBackups();
    }

    // ─── Scheduler hook ───────────────────────────────────────────────────────

    @Scheduled(cron = CRON)
    public void scheduledRun() {
        doRun();
        jobService.refreshNextRun(JOB_ID);
    }

    // ─── Core logic ───────────────────────────────────────────────────────────

    public void doRun() {
        JobService.JobEntry state = jobService.getEntry(JOB_ID).orElse(null);
        if (state == null || state.isRunning()) return;

        state.setRunning(true);
        state.setStatus("RUNNING");
        state.setProgressPercent(0);
        state.setLastRunAt(Instant.now());
        state.setLastRunMessage("Initializing backup...");

        Path errFile = null;
        Path outFile = null;

        try {
            // Ensure backup directory exists
            Path dir = Path.of(backupDir);
            Files.createDirectories(dir);

            String filename = "backup-"
                    + LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
                    + ".sql.gz";
            outFile = dir.resolve(filename);

            errFile = Files.createTempFile("pgdump_err_", ".txt");

            state.setProgressPercent(10);
            state.setLastRunMessage("Running pg_dump via docker exec...");

            // Run: docker exec -e PGPASSWORD=<pass> <container> pg_dump -U <user> -d <db>
            ProcessBuilder pb = new ProcessBuilder(
                    "docker", "exec",
                    "-e", "PGPASSWORD=" + dbPassword,
                    dbContainer,
                    "pg_dump", "-U", dbUser, "-d", dbName);
            pb.redirectError(errFile.toFile()); // stderr → temp file (prevents stdout deadlock)

            Process process = pb.start();
            state.setProgressPercent(30);

            // Stream pg_dump stdout → compressed file
            try (GZIPOutputStream gz = new GZIPOutputStream(
                    new BufferedOutputStream(Files.newOutputStream(outFile)));
                 InputStream in = new BufferedInputStream(process.getInputStream())) {
                in.transferTo(gz);
            }

            state.setProgressPercent(80);
            state.setLastRunMessage("Finalizing...");

            int exitCode = process.waitFor();

            if (exitCode != 0) {
                String errText = "";
                try { errText = Files.readString(errFile).trim(); } catch (Exception ignored) {}
                Files.deleteIfExists(outFile);
                outFile = null;
                state.setStatus("FAILED");
                state.setProgressPercent(0);
                state.setLastRunMessage("pg_dump failed (exit " + exitCode + ")"
                        + (errText.isEmpty() ? "" : ": " + errText));
            } else {
                long fileSize = Files.size(outFile);
                state.setLastBackupSizeBytes(fileSize);
                state.setStatus("SUCCESS");
                state.setProgressPercent(100);
                state.setLastRunMessage("✓ Backup saved: " + filename
                        + " (" + formatBytes(fileSize) + ")");
                deleteOldBackups(dir);
                refreshRecentBackups();
            }

        } catch (Exception e) {
            state.setStatus("FAILED");
            state.setProgressPercent(0);
            state.setLastRunMessage("Error: " + e.getMessage());
            if (outFile != null) {
                try { Files.deleteIfExists(outFile); } catch (Exception ignored) {}
            }
        } finally {
            state.setRunning(false);
            if (errFile != null) {
                try { Files.deleteIfExists(errFile); } catch (Exception ignored) {}
            }
        }
    }

    // ─── Cleanup ──────────────────────────────────────────────────────────────

    private void deleteOldBackups(Path dir) {
        Instant cutoff = Instant.now().minus(retentionDays, ChronoUnit.DAYS);
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(dir, "backup-*.sql.gz")) {
            for (Path file : stream) {
                try {
                    if (Files.getLastModifiedTime(file).toInstant().isBefore(cutoff)) {
                        Files.deleteIfExists(file);
                    }
                } catch (Exception ignored) {}
            }
        } catch (Exception ignored) {}
    }

    private void refreshRecentBackups() {
        jobService.getEntry(JOB_ID).ifPresent(state -> {
            try {
                Path dir = Path.of(backupDir);
                if (!Files.exists(dir)) { state.setRecentBackups(List.of()); return; }
                try (var stream = Files.list(dir)) {
                    List<String> files = stream
                            .filter(p -> p.getFileName().toString().startsWith("backup-")
                                    && p.toString().endsWith(".sql.gz"))
                            .sorted(Comparator.reverseOrder())
                            .limit(5)
                            .map(p -> p.getFileName().toString())
                            .toList();
                    state.setRecentBackups(files);
                }
            } catch (Exception ignored) {}
        });
    }

    // ─── Util ─────────────────────────────────────────────────────────────────

    private static String formatBytes(long bytes) {
        if (bytes < 1_024)             return bytes + " B";
        if (bytes < 1_024 * 1_024)    return String.format("%.1f KB", bytes / 1_024.0);
        return                                String.format("%.1f MB", bytes / (1_024.0 * 1_024.0));
    }
}
