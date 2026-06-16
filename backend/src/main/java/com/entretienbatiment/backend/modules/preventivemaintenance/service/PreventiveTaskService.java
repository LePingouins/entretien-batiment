package com.entretienbatiment.backend.modules.preventivemaintenance.service;

import com.entretienbatiment.backend.common.security.CurrentUser;
import com.entretienbatiment.backend.modules.auth.model.AppUser;
import com.entretienbatiment.backend.modules.auth.repository.AppUserRepository;
import com.entretienbatiment.backend.modules.preventivemaintenance.dto.PreventiveTaskResponse;
import com.entretienbatiment.backend.modules.preventivemaintenance.model.PreventiveTask;
import com.entretienbatiment.backend.modules.preventivemaintenance.model.PreventiveTaskCompletion;
import com.entretienbatiment.backend.modules.preventivemaintenance.model.TaskFrequency;
import com.entretienbatiment.backend.modules.preventivemaintenance.repository.PreventiveTaskCompletionRepository;
import com.entretienbatiment.backend.modules.preventivemaintenance.repository.PreventiveTaskRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PreventiveTaskService {

    private final PreventiveTaskRepository taskRepo;
    private final PreventiveTaskCompletionRepository completionRepo;
    private final AppUserRepository userRepo;
    private final CurrentUser currentUser;

    public PreventiveTaskService(
            PreventiveTaskRepository taskRepo,
            PreventiveTaskCompletionRepository completionRepo,
            AppUserRepository userRepo,
            CurrentUser currentUser) {
        this.taskRepo = taskRepo;
        this.completionRepo = completionRepo;
        this.userRepo = userRepo;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public List<PreventiveTaskResponse> getAllTasks() {
        List<PreventiveTask> tasks = taskRepo.findAllByActiveTrueOrderByDisplayOrderAsc();

        // One query for all latest completions, then group by task id
        List<PreventiveTaskCompletion> latestCompletions = completionRepo.findLatestCompletionPerTask();
        Map<Long, PreventiveTaskCompletion> latestByTaskId = new HashMap<>();
        for (PreventiveTaskCompletion c : latestCompletions) {
            latestByTaskId.put(c.getTask().getId(), c);
        }

        return tasks.stream()
                .map(task -> toResponse(task, latestByTaskId.get(task.getId())))
                .toList();
    }

    @Transactional
    public PreventiveTaskResponse completeTask(Long taskId) {
        PreventiveTask task = taskRepo.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));

        Long userId = currentUser.userIdOrNull();
        AppUser user = userId != null ? userRepo.findById(userId).orElse(null) : null;

        PreventiveTaskCompletion completion = new PreventiveTaskCompletion();
        completion.setTask(task);
        completion.setCompletedBy(user);
        completion.setCompletedAt(Instant.now());
        completionRepo.save(completion);

        return toResponse(task, completion);
    }

    @Transactional
    public void uncompleteTask(Long taskId, Long completionId) {
        PreventiveTaskCompletion completion = completionRepo.findById(completionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Completion not found"));
        if (!completion.getTask().getId().equals(taskId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Completion does not belong to this task");
        }
        completionRepo.delete(completion);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private PreventiveTaskResponse toResponse(PreventiveTask task, PreventiveTaskCompletion latest) {
        boolean isDue = isDue(task.getFrequency(), latest);
        Instant lastCompletedAt = latest != null ? latest.getCompletedAt() : null;
        Long lastCompletionId = latest != null ? latest.getId() : null;
        String lastCompletedByEmail = (latest != null && latest.getCompletedBy() != null)
                ? latest.getCompletedBy().getEmail()
                : null;

        return new PreventiveTaskResponse(
                task.getId(),
                task.getName(),
                task.getFrequency().name(),
                task.getSite().name(),
                task.getDisplayOrder(),
                isDue,
                lastCompletedAt,
                lastCompletionId,
                lastCompletedByEmail
        );
    }

    private boolean isDue(TaskFrequency frequency, PreventiveTaskCompletion lastCompletion) {
        if (lastCompletion == null) return true;
        Instant lastDone = lastCompletion.getCompletedAt();
        Instant now = Instant.now();
        return switch (frequency) {
            case DAILY      -> lastDone.isBefore(now.minus(1,   ChronoUnit.DAYS));
            case WEEKLY     -> lastDone.isBefore(now.minus(7,   ChronoUnit.DAYS));
            case MONTHLY    -> lastDone.isBefore(now.minus(30,  ChronoUnit.DAYS));
            case QUARTERLY  -> lastDone.isBefore(now.minus(90,  ChronoUnit.DAYS));
            case SEMI_ANNUAL -> lastDone.isBefore(now.minus(183, ChronoUnit.DAYS));
            case YEARLY     -> lastDone.isBefore(now.minus(365, ChronoUnit.DAYS));
        };
    }
}
