package com.entretienbatiment.backend.modules.projectboard.service;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import com.entretienbatiment.backend.modules.files.config.UploadPaths;
import com.entretienbatiment.backend.modules.projectboard.model.ProjectBoardTask;
import com.entretienbatiment.backend.modules.projectboard.repository.ProjectBoardTaskRepository;

@Service
public class ProjectBoardTaskService {
    private final ProjectBoardTaskRepository repository;
    private final UploadPaths uploadPaths;

    public ProjectBoardTaskService(ProjectBoardTaskRepository repository, UploadPaths uploadPaths) {
        this.repository = repository;
        this.uploadPaths = uploadPaths;
    }

    public Optional<ProjectBoardTask> findById(Long id) {
        return repository.findById(id);
    }

    public List<ProjectBoardTask> findAll() {
        return repository.findByArchivedFalse();
    }

    public List<ProjectBoardTask> findAllActiveFiltered(String q, String status, String location, Long assignedToUserId) {
        Specification<ProjectBoardTask> spec = ProjectBoardSpecifications.archivedEquals(false)
                .and(ProjectBoardSpecifications.textOrIdSearch(q))
                .and(ProjectBoardSpecifications.statusEquals(status))
                .and(ProjectBoardSpecifications.locationEquals(location))
                .and(ProjectBoardSpecifications.assignedToUserIdEquals(assignedToUserId));
        return repository.findAll(spec);
    }

    public List<ProjectBoardTask> findAllArchived(String q, String status, String location) {
        Specification<ProjectBoardTask> spec = ProjectBoardSpecifications.archivedEquals(true)
                .and(ProjectBoardSpecifications.textOrIdSearch(q))
                .and(ProjectBoardSpecifications.statusEquals(status))
                .and(ProjectBoardSpecifications.locationEquals(location));
        return repository.findAll(spec);
    }

    public ProjectBoardTask save(ProjectBoardTask task) {
        return repository.save(task);
    }

    public void deleteById(Long id) {
        repository.findById(id).ifPresent(task -> {
            deleteStoredFile(task.getAttachmentFilename());
            deleteStoredFile(task.getInvoiceFilename());
            repository.deleteById(id);
        });
    }

    public void archive(Long id) {
        repository.findById(id).ifPresent(task -> {
            task.setArchived(true);
            task.setArchivedAt(java.time.LocalDateTime.now());
            repository.save(task);
        });
    }

    public void unarchive(Long id) {
        repository.findById(id).ifPresent(task -> {
            task.setArchived(false);
            task.setArchivedAt(null);
            repository.save(task);
        });
    }

    /** Reorder tasks within a single status column (drag within the same column). */
    @org.springframework.transaction.annotation.Transactional
    public void reorderInColumn(String status, List<Long> orderedIds) {
        List<ProjectBoardTask> columnItems = repository.findByStatusAndArchivedFalse(status);

        java.util.Set<Long> validIds = columnItems.stream().map(ProjectBoardTask::getId).collect(Collectors.toSet());
        for (Long id : orderedIds) {
            if (!validIds.contains(id)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Project board task " + id + " does not belong to status " + status);
            }
        }

        Map<Long, ProjectBoardTask> taskMap = columnItems.stream()
                .collect(Collectors.toMap(ProjectBoardTask::getId, t -> t));
        for (int i = 0; i < orderedIds.size(); i++) {
            ProjectBoardTask task = taskMap.get(orderedIds.get(i));
            if (task != null) {
                task.setSortIndex(i);
            }
        }

        int nextIndex = orderedIds.size();
        for (ProjectBoardTask task : columnItems) {
            if (!orderedIds.contains(task.getId())) {
                task.setSortIndex(nextIndex++);
            }
        }

        repository.saveAll(columnItems);
    }

    /** Move a task to a different status column at a specific index (cross-column drag). */
    @org.springframework.transaction.annotation.Transactional
    public ProjectBoardTask move(Long id, String newStatus, int newIndex) {
        ProjectBoardTask task = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project board task not found"));

        String oldStatus = task.getStatus();
        task.setStatus(newStatus);

        List<ProjectBoardTask> destColumnItems = repository.findByStatusAndArchivedFalse(newStatus).stream()
                .sorted((a, b) -> {
                    Integer ai = a.getSortIndex();
                    Integer bi = b.getSortIndex();
                    if (ai == null && bi == null) return 0;
                    if (ai == null) return 1;
                    if (bi == null) return -1;
                    return ai - bi;
                })
                .collect(Collectors.toCollection(java.util.ArrayList::new));
        destColumnItems.removeIf(t -> t.getId().equals(id));

        int insertIndex = Math.min(Math.max(0, newIndex), destColumnItems.size());
        destColumnItems.add(insertIndex, task);

        for (int i = 0; i < destColumnItems.size(); i++) {
            destColumnItems.get(i).setSortIndex(i);
        }
        repository.saveAll(destColumnItems);

        if (!oldStatus.equals(newStatus)) {
            List<ProjectBoardTask> sourceColumnItems = repository.findByStatusAndArchivedFalse(oldStatus);
            for (int i = 0; i < sourceColumnItems.size(); i++) {
                sourceColumnItems.get(i).setSortIndex(i);
            }
            repository.saveAll(sourceColumnItems);
        }

        return task;
    }

    private void deleteStoredFile(String filename) {
        if (filename == null || filename.isBlank()) {
            return;
        }
        try {
            java.nio.file.Files.deleteIfExists(uploadPaths.workOrders().resolve(filename));
        } catch (Exception ignored) {
            // Keep request successful even if stale file cannot be removed.
        }
    }
}
