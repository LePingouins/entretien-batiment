package com.entretienbatiment.backend.modules.projectboard.controller;

import com.entretienbatiment.backend.modules.auth.repository.AppUserRepository;
import com.entretienbatiment.backend.modules.notifications.service.NotificationService;
import com.entretienbatiment.backend.modules.files.config.UploadPaths;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import com.entretienbatiment.backend.modules.projectboard.model.ProjectBoardTask;
import com.entretienbatiment.backend.modules.projectboard.service.ProjectBoardTaskService;
import com.entretienbatiment.backend.modules.projectboard.dto.ProjectBoardTaskRequestDto;
import com.entretienbatiment.backend.modules.projectboard.dto.ProjectBoardTaskMultipartRequest;
import com.entretienbatiment.backend.modules.projectboard.dto.MoveProjectBoardTaskRequest;
import com.entretienbatiment.backend.modules.projectboard.dto.ReorderProjectBoardTasksRequest;

@RestController
@RequestMapping("/api/project-board")
@PreAuthorize("@pageAccessService.canAccess(authentication, 'PROJECT_BOARD')")
public class ProjectBoardController {

    private final ProjectBoardTaskService service;
    private final NotificationService notificationService;
    private final AppUserRepository userRepository;
    private final UploadPaths uploadPaths;

    public ProjectBoardController(
            ProjectBoardTaskService service,
            NotificationService notificationService,
            AppUserRepository userRepository,
            UploadPaths uploadPaths
    ) {
        this.service = service;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
        this.uploadPaths = uploadPaths;
    }

    @GetMapping
    public List<ProjectBoardTask> getAll(@RequestParam(required = false) String q,
                                          @RequestParam(required = false) String status,
                                          @RequestParam(required = false) String location,
                                          @RequestParam(required = false) Long assignedToUserId) {
        if (q == null && status == null && location == null && assignedToUserId == null) {
            return enrichDisplayNames(service.findAll());
        }
        return enrichDisplayNames(service.findAllActiveFiltered(q, status, location, assignedToUserId));
    }

    @GetMapping("/archived")
    public List<ProjectBoardTask> getAllArchived(@RequestParam(required = false) String q,
                                                  @RequestParam(required = false) String status,
                                                  @RequestParam(required = false) String location) {
        return enrichDisplayNames(service.findAllArchived(q, status, location));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectBoardTask> getById(@PathVariable Long id) {
        return service.findById(id)
                .map(this::enrichDisplayNames)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ProjectBoardTask createMultipart(@ModelAttribute ProjectBoardTaskMultipartRequest request, Authentication auth) {
        ProjectBoardTask task = new ProjectBoardTask(
                requireNonBlank(request.getTitle(), "title"),
                request.getDescription(),
                request.getLocation(),
                request.getStatus() != null ? request.getStatus() : "OPEN"
        );
        task.setPriority(request.getPriority());
        task.setCreatedByUserId(extractUserId(auth));
        task.setAssignedToUserId(resolveAssigneeUserId(parseNullableLong(request.getAssignedToUserId())));
        if (request.getDueDate() != null && !request.getDueDate().isEmpty()) {
            task.setDueDate(parseDateTimeValue(request.getDueDate()));
        }
        if (request.getFiles() != null && !request.getFiles().isEmpty()) {
            storeAttachment(task, request.getFiles().get(0));
        }
        if (request.getInvoiceFiles() != null && !request.getInvoiceFiles().isEmpty()) {
            storeInvoice(task, request.getInvoiceFiles().get(0));
        }
        ProjectBoardTask saved = service.save(task);
        notifyCreated(saved);
        return enrichDisplayNames(saved);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ProjectBoardTask createJson(@RequestBody ProjectBoardTaskRequestDto request, Authentication auth) {
        ProjectBoardTask task = new ProjectBoardTask(
                requireNonBlank(request.getTitle(), "title"),
                request.getDescription(),
                request.getLocation(),
                request.getStatus() != null ? request.getStatus() : "OPEN"
        );
        task.setPriority(request.getPriority());
        task.setCreatedByUserId(extractUserId(auth));
        task.setAssignedToUserId(resolveAssigneeUserId(request.getAssignedToUserId()));
        if (request.getDueDate() != null && !request.getDueDate().isEmpty()) {
            task.setDueDate(parseDateTimeValue(request.getDueDate()));
        }
        ProjectBoardTask saved = service.save(task);
        notifyCreated(saved);
        return enrichDisplayNames(saved);
    }

    @PatchMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProjectBoardTask> patchMultipart(@PathVariable Long id, @ModelAttribute ProjectBoardTaskMultipartRequest updates) {
        return service.findById(id)
                .map(existing -> {
                    if (updates.getTitle() != null) existing.setTitle(updates.getTitle());
                    if (updates.getDescription() != null) existing.setDescription(updates.getDescription());
                    if (updates.getLocation() != null) existing.setLocation(updates.getLocation());
                    if (updates.getDueDate() != null) {
                        existing.setDueDate(updates.getDueDate().isEmpty() ? null : parseDateTimeValue(updates.getDueDate()));
                    }
                    if (updates.getPriority() != null) existing.setPriority(updates.getPriority());
                    if (updates.getStatus() != null) existing.setStatus(updates.getStatus());
                    if (updates.getAssignedToUserId() != null) {
                        Long assignedId = parseNullableLong(updates.getAssignedToUserId());
                        existing.setAssignedToUserId(assignedId == null ? null : resolveAssigneeUserId(assignedId));
                    }

                    boolean hasNewFile = updates.getFiles() != null && !updates.getFiles().isEmpty();
                    if (hasNewFile) {
                        storeAttachment(existing, updates.getFiles().get(0));
                    } else if (Boolean.TRUE.equals(updates.getRemoveAttachment())) {
                        clearAttachment(existing);
                    }

                    boolean hasNewInvoice = updates.getInvoiceFiles() != null && !updates.getInvoiceFiles().isEmpty();
                    if (hasNewInvoice) {
                        storeInvoice(existing, updates.getInvoiceFiles().get(0));
                    } else if (Boolean.TRUE.equals(updates.getRemoveInvoice())) {
                        clearInvoice(existing);
                    }

                    return ResponseEntity.ok(enrichDisplayNames(service.save(existing)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ProjectBoardTask> patchJson(@PathVariable Long id, @RequestBody java.util.Map<String, Object> updates) {
        return service.findById(id)
                .map(existing -> {
                    if (updates.containsKey("title")) existing.setTitle((String) updates.get("title"));
                    if (updates.containsKey("description")) existing.setDescription((String) updates.get("description"));
                    if (updates.containsKey("location")) existing.setLocation((String) updates.get("location"));
                    if (updates.containsKey("dueDate")) {
                        Object dueDate = updates.get("dueDate");
                        existing.setDueDate(dueDate instanceof String s && !s.isEmpty() ? parseDateTimeValue(s) : null);
                    }
                    if (updates.containsKey("priority")) existing.setPriority((String) updates.get("priority"));
                    if (updates.containsKey("status")) existing.setStatus((String) updates.get("status"));
                    if (updates.containsKey("assignedToUserId")) {
                        Long assignedId = parseNullableLong(updates.get("assignedToUserId"));
                        existing.setAssignedToUserId(assignedId == null ? null : resolveAssigneeUserId(assignedId));
                    }
                    if (updates.containsKey("removeAttachment") && parseNullableBoolean(updates.get("removeAttachment"))) {
                        clearAttachment(existing);
                    }
                    return ResponseEntity.ok(enrichDisplayNames(service.save(existing)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/archive")
    public ResponseEntity<Void> archive(@PathVariable Long id) {
        service.archive(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/unarchive")
    public ResponseEntity<Void> unarchive(@PathVariable Long id) {
        service.unarchive(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/move")
    public ProjectBoardTask move(@PathVariable Long id, @Valid @RequestBody MoveProjectBoardTaskRequest req) {
        return enrichDisplayNames(service.move(id, req.newStatus(), req.newIndex()));
    }

    @PatchMapping("/reorder")
    public ResponseEntity<Void> reorder(@Valid @RequestBody ReorderProjectBoardTasksRequest req) {
        service.reorderInColumn(req.status(), req.orderedIds());
        return ResponseEntity.noContent().build();
    }

    private Long resolveAssigneeUserId(Long requestedAssigneeUserId) {
        if (requestedAssigneeUserId == null) {
            return null;
        }
        return userRepository.findById(requestedAssigneeUserId)
                .filter(com.entretienbatiment.backend.modules.auth.model.AppUser::isEnabled)
                .map(com.entretienbatiment.backend.modules.auth.model.AppUser::getId)
                .orElseThrow(() -> new ResponseStatusException(
                        org.springframework.http.HttpStatus.BAD_REQUEST,
                        "assignedToUserId must reference an enabled user"
                ));
    }

    private void notifyCreated(ProjectBoardTask saved) {
        if (saved.getAssignedToUserId() != null) {
            notificationService.notifyUser(
                    saved.getAssignedToUserId(),
                    "New Project Board Task Assigned",
                    "Project board task \"" + saved.getTitle() + "\" was assigned to you.",
                    "/admin/project-board",
                    "project-board-create"
            );
        }
    }

    private Long parseNullableLong(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) return number.longValue();
        if (value instanceof String text) {
            if (text.isBlank()) return null;
            try {
                return Long.parseLong(text.trim());
            } catch (NumberFormatException ex) {
                throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "assignedToUserId must be numeric");
            }
        }
        throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "assignedToUserId has invalid type");
    }

    private boolean parseNullableBoolean(Object value) {
        if (value == null) return false;
        if (value instanceof Boolean boolValue) return boolValue;
        if (value instanceof String textValue) return Boolean.parseBoolean(textValue.trim());
        return false;
    }

    private java.time.LocalDateTime parseDateTimeValue(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "date value is required");
        }
        String normalized = rawValue.trim();
        if (normalized.length() == 10) {
            normalized += "T00:00:00";
        }
        try {
            return java.time.LocalDateTime.parse(normalized);
        } catch (java.time.format.DateTimeParseException ex) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "invalid date format");
        }
    }

    private String requireNonBlank(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, fieldName + " is required");
        }
        return value.trim();
    }

    private void storeAttachment(ProjectBoardTask task, MultipartFile file) {
        String previousFilename = task.getAttachmentFilename();
        try {
            String originalFilename = file.getOriginalFilename();
            String ext = originalFilename != null && originalFilename.contains(".")
                    ? originalFilename.substring(originalFilename.lastIndexOf('.'))
                    : "";
            String storedFilename = java.util.UUID.randomUUID() + ext;
            java.nio.file.Path uploadDir = uploadPaths.workOrders();
            java.nio.file.Files.createDirectories(uploadDir);
            file.transferTo(uploadDir.resolve(storedFilename));
            task.setAttachmentFilename(storedFilename);
            task.setAttachmentContentType(file.getContentType());
            task.setAttachmentDownloadUrl("/api/files/workorders/" + storedFilename);
            if (previousFilename != null && !previousFilename.isBlank() && !previousFilename.equals(storedFilename)) {
                deleteStoredFile(previousFilename);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to store file", e);
        }
    }

    private void clearAttachment(ProjectBoardTask task) {
        String previousFilename = task.getAttachmentFilename();
        task.setAttachmentFilename(null);
        task.setAttachmentContentType(null);
        task.setAttachmentDownloadUrl(null);
        deleteStoredFile(previousFilename);
    }

    private void storeInvoice(ProjectBoardTask task, MultipartFile file) {
        String previousFilename = task.getInvoiceFilename();
        try {
            String originalFilename = file.getOriginalFilename();
            String ext = originalFilename != null && originalFilename.contains(".")
                    ? originalFilename.substring(originalFilename.lastIndexOf('.'))
                    : "";
            String storedFilename = java.util.UUID.randomUUID() + ext;
            java.nio.file.Path uploadDir = uploadPaths.workOrders();
            java.nio.file.Files.createDirectories(uploadDir);
            file.transferTo(uploadDir.resolve(storedFilename));
            task.setInvoiceFilename(storedFilename);
            task.setInvoiceContentType(file.getContentType());
            if (previousFilename != null && !previousFilename.isBlank() && !previousFilename.equals(storedFilename)) {
                deleteStoredFile(previousFilename);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to store invoice file", e);
        }
    }

    private void clearInvoice(ProjectBoardTask task) {
        String previousFilename = task.getInvoiceFilename();
        task.setInvoiceFilename(null);
        task.setInvoiceContentType(null);
        deleteStoredFile(previousFilename);
    }

    private void deleteStoredFile(String filename) {
        if (filename == null || filename.isBlank()) return;
        try {
            java.nio.file.Files.deleteIfExists(uploadPaths.workOrders().resolve(filename));
        } catch (Exception ignored) {
            // Keep request successful even if stale file cannot be removed.
        }
    }

    private Long extractUserId(Authentication auth) {
        if (auth == null || auth.getDetails() == null) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "unauthenticated");
        }
        try {
            return Long.parseLong(auth.getDetails().toString());
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "invalid user id");
        }
    }

    private List<ProjectBoardTask> enrichDisplayNames(List<ProjectBoardTask> tasks) {
        if (tasks == null || tasks.isEmpty()) return tasks;
        java.util.Set<Long> userIds = new java.util.HashSet<>();
        for (ProjectBoardTask task : tasks) {
            if (task.getCreatedByUserId() != null) userIds.add(task.getCreatedByUserId());
            if (task.getAssignedToUserId() != null) userIds.add(task.getAssignedToUserId());
        }
        java.util.Map<Long, String> userNames = new java.util.HashMap<>();
        if (!userIds.isEmpty()) {
            userRepository.findAllById(userIds).forEach(user -> userNames.put(user.getId(), user.getEmail()));
        }
        for (ProjectBoardTask task : tasks) {
            task.setCreatedByName(userNames.get(task.getCreatedByUserId()));
            task.setAssignedToName(userNames.get(task.getAssignedToUserId()));
        }
        return tasks;
    }

    private ProjectBoardTask enrichDisplayNames(ProjectBoardTask task) {
        if (task == null) return null;
        return enrichDisplayNames(List.of(task)).get(0);
    }
}
