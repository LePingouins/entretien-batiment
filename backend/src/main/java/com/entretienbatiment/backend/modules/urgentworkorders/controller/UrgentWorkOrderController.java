package com.entretienbatiment.backend.modules.urgentworkorders.controller;

import com.entretienbatiment.backend.modules.auth.repository.AppUserRepository;
import com.entretienbatiment.backend.modules.auth.model.Role;
import com.entretienbatiment.backend.modules.notifications.service.NotificationService;
import com.entretienbatiment.backend.modules.audit.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import com.entretienbatiment.backend.modules.urgentworkorders.model.UrgentWorkOrder;
import com.entretienbatiment.backend.modules.urgentworkorders.service.UrgentWorkOrderService;
import com.entretienbatiment.backend.modules.urgentworkorders.dto.UrgentWorkOrderRequestDto;
import com.entretienbatiment.backend.modules.urgentworkorders.dto.UrgentWorkOrderMultipartRequest;

import org.springframework.beans.factory.annotation.Value;

@RestController
@RequestMapping("/api/urgent-work-orders")
@PreAuthorize("@pageAccessService.canAccess(authentication, 'URGENT_WORK_ORDERS')")
public class UrgentWorkOrderController {
    private final String defaultTechnicianEmail;

    private final UrgentWorkOrderService service;
    private final NotificationService notificationService;
    private final AppUserRepository userRepository;
    private final AuditLogService auditLogService;

    public UrgentWorkOrderController(
            UrgentWorkOrderService service,
            NotificationService notificationService,
            AppUserRepository userRepository,
            AuditLogService auditLogService,
            @Value("${app.default-technician-email:}") String defaultTechnicianEmail
    ) {
        this.service = service;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
        this.defaultTechnicianEmail = defaultTechnicianEmail;
    }

    @GetMapping
    public List<UrgentWorkOrder> getAll(@RequestParam(required = false) String q,
                                        @RequestParam(required = false) String status,
                                        @RequestParam(required = false) String location,
                                        @RequestParam(required = false) String technician) {
        // If no filters, return all non-archived
        if (q == null && status == null && location == null && technician == null) {
            return enrichDisplayNames(service.findAll());
        }
        return enrichDisplayNames(service.findAllActiveFiltered(q, status, location, technician));
    }

    @GetMapping("/archived")
    public List<UrgentWorkOrder> getAllArchived(@RequestParam(required = false) String q,
                                                @RequestParam(required = false) String status,
                                                @RequestParam(required = false) String location) {
        return enrichDisplayNames(service.findAllArchived(q, status, location));
    }


    @GetMapping("/{id}")
    public ResponseEntity<UrgentWorkOrder> getById(@PathVariable Long id) {
        return service.findById(id)
                .map(this::enrichDisplayNames)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UrgentWorkOrder createMultipart(
            @ModelAttribute UrgentWorkOrderMultipartRequest request,
            Authentication auth,
            HttpServletRequest httpReq
    ) {
        Long createdByUserId = extractUserId(auth);
        UrgentWorkOrder urgentWorkOrder = new UrgentWorkOrder(
                requireNonBlank(request.getTitle(), "title"),
                requireNonBlank(request.getDescription(), "description"),
                requireNonBlank(request.getLocation(), "location"),
                request.getStatus() != null ? request.getStatus() : "IN_PROGRESS"
        );
        urgentWorkOrder.setPriority(request.getPriority());
        urgentWorkOrder.setCreatedByUserId(createdByUserId);
        Long assignedToUserId = parseNullableLong(request.getAssignedToUserId());
        urgentWorkOrder.setAssignedToUserId(resolveAssigneeUserIdForCreate(assignedToUserId));
        if (request.getDueDate() != null && !request.getDueDate().isEmpty()) {
            urgentWorkOrder.setDueDate(parseDateTimeValue(request.getDueDate()));
        }
        if (request.getFiles() != null && !request.getFiles().isEmpty()) {
            storeAttachment(urgentWorkOrder, request.getFiles().get(0));
        }
        if (request.getInvoiceFiles() != null && !request.getInvoiceFiles().isEmpty()) {
            storeInvoice(urgentWorkOrder, request.getInvoiceFiles().get(0));
        }
        UrgentWorkOrder saved = service.save(urgentWorkOrder);
        auditLogService.log("CREATE_URGENT_WORK_ORDER", "URGENT_WORK_ORDER", saved.getId(), saved.getTitle(), null, httpReq);
        notificationService.notifyAdmins(
                "New Urgent Work Order",
                "Urgent work order \"" + saved.getTitle() + "\" was created.",
                "/admin/urgent-work-orders/" + saved.getId(),
                "urgent-create"
        );
        if (saved.getAssignedToUserId() != null) {
            notificationService.notifyUser(
                saved.getAssignedToUserId(),
                "New Urgent Work Order Assigned",
                "Urgent work order \"" + saved.getTitle() + "\" was assigned to you.",
                "/tech/urgent-work-orders/" + saved.getId(),
                "urgent-create"
            );
        }
        return enrichDisplayNames(saved);
    }

    // Support JSON requests (no files)
    @PostMapping(consumes = {"application/json"})
    public UrgentWorkOrder createJson(@RequestBody UrgentWorkOrderRequestDto request, Authentication auth, HttpServletRequest httpReq) {
        Long createdByUserId = extractUserId(auth);
        UrgentWorkOrder urgentWorkOrder = new UrgentWorkOrder(
                request.getTitle(),
                request.getDescription(),
                request.getLocation(),
                request.getStatus() != null ? request.getStatus() : "IN_PROGRESS"
        );
        urgentWorkOrder.setPriority(request.getPriority());
        urgentWorkOrder.setCreatedByUserId(createdByUserId);
        urgentWorkOrder.setAssignedToUserId(resolveAssigneeUserIdForCreate(request.getAssignedToUserId()));
        if (request.getDueDate() != null && !request.getDueDate().isEmpty()) {
            urgentWorkOrder.setDueDate(parseDateTimeValue(request.getDueDate()));
        }
        UrgentWorkOrder saved = service.save(urgentWorkOrder);
        auditLogService.log("CREATE_URGENT_WORK_ORDER", "URGENT_WORK_ORDER", saved.getId(), saved.getTitle(), null, httpReq);
        notificationService.notifyAdmins(
                "New Urgent Work Order",
                "Urgent work order \"" + saved.getTitle() + "\" was created.",
                "/admin/urgent-work-orders/" + saved.getId(),
                "urgent-create"
        );
        if (saved.getAssignedToUserId() != null) {
            notificationService.notifyUser(
                saved.getAssignedToUserId(),
                "New Urgent Work Order Assigned",
                "Urgent work order \"" + saved.getTitle() + "\" was assigned to you.",
                "/tech/urgent-work-orders/" + saved.getId(),
                "urgent-create"
            );
        }
        return enrichDisplayNames(saved);
    }

    @PatchMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UrgentWorkOrder> patchFieldsMultipart(
            @PathVariable Long id,
            @ModelAttribute UrgentWorkOrderMultipartRequest updates
    ) {
        return service.findById(id)
                .map(existing -> {
                    if (updates.getTitle() != null) {
                        existing.setTitle(updates.getTitle());
                    }
                    if (updates.getDescription() != null) {
                        existing.setDescription(updates.getDescription());
                    }
                    if (updates.getLocation() != null) {
                        existing.setLocation(updates.getLocation());
                    }
                    if (updates.getDueDate() != null) {
                        if (!updates.getDueDate().isEmpty()) {
                            existing.setDueDate(parseDateTimeValue(updates.getDueDate()));
                        } else {
                            existing.setDueDate(null);
                        }
                    }
                    if (updates.getPriority() != null) {
                        existing.setPriority(updates.getPriority());
                    }
                    if (updates.getStatus() != null) {
                        existing.setStatus(updates.getStatus());
                    }
                    if (updates.getAssignedToUserId() != null) {
                        Long assignedId = parseNullableLong(updates.getAssignedToUserId());
                        if (assignedId == null) {
                            existing.setAssignedToUserId(null);
                        } else {
                            existing.setAssignedToUserId(requireActiveTechId(assignedId));
                        }
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
    public ResponseEntity<UrgentWorkOrder> patchFields(@PathVariable Long id, @RequestBody java.util.Map<String, Object> updates) {
        return service.findById(id)
                .map(existing -> {
                    if (updates.containsKey("title")) {
                        existing.setTitle((String) updates.get("title"));
                    }
                    if (updates.containsKey("description")) {
                        existing.setDescription((String) updates.get("description"));
                    }
                    if (updates.containsKey("location")) {
                        existing.setLocation((String) updates.get("location"));
                    }
                    if (updates.containsKey("dueDate")) {
                        Object dueDate = updates.get("dueDate");
                        if (dueDate instanceof String && !((String) dueDate).isEmpty()) {
                            existing.setDueDate(parseDateTimeValue((String) dueDate));
                        } else {
                            existing.setDueDate(null);
                        }
                    }
                    if (updates.containsKey("priority")) {
                        existing.setPriority((String) updates.get("priority"));
                    }
                    if (updates.containsKey("status")) {
                        existing.setStatus((String) updates.get("status"));
                    }
                    if (updates.containsKey("assignedToUserId")) {
                        Object assignedRaw = updates.get("assignedToUserId");
                        Long assignedId = parseNullableLong(assignedRaw);
                        if (assignedId == null) {
                            existing.setAssignedToUserId(null);
                        } else {
                            existing.setAssignedToUserId(requireActiveTechId(assignedId));
                        }
                    }
                    if (updates.containsKey("completedAt")) {
                        Object completedAt = updates.get("completedAt");
                        if (completedAt instanceof String && !((String) completedAt).isEmpty()) {
                            existing.setCompletedAt(parseDateTimeValue((String) completedAt));
                        } else {
                            existing.setCompletedAt(null);
                        }
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

    // PATCH endpoint for reordering urgent work orders within a status column
    @PatchMapping("/reorder")
    public ResponseEntity<Void> reorderUrgentWorkOrders(@RequestBody ReorderUrgentWorkOrdersRequest req) {
        service.reorderUrgentWorkOrdersInColumn(req.status, req.orderedIds);
        return ResponseEntity.noContent().build();
    }

    // DTO for reorder requests
    public static class ReorderUrgentWorkOrdersRequest {
        public String status;
        public java.util.List<Long> orderedIds;
    }

    private Long resolveAssigneeUserIdForCreate(Long requestedAssigneeUserId) {
        if (requestedAssigneeUserId != null) {
            return requireActiveTechId(requestedAssigneeUserId);
        }

        return userRepository.findByEmailIgnoreCase(defaultTechnicianEmail)
                .filter(user -> user.isEnabled() && user.getRole() == Role.TECH)
                .map(user -> user.getId())
                .orElse(null);
    }

    private Long requireActiveTechId(Long userId) {
        return userRepository.findById(userId)
                .filter(user -> user.isEnabled() && user.getRole() == Role.TECH)
                .map(user -> user.getId())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.BAD_REQUEST,
                        "assignedToUserId must reference an enabled TECH user"
                ));
    }

    private Long parseNullableLong(Object value) {
        if (value == null) {
            return null;
        }

        if (value instanceof Number number) {
            return number.longValue();
        }

        if (value instanceof String text) {
            if (text.isBlank()) {
                return null;
            }
            try {
                return Long.parseLong(text.trim());
            } catch (NumberFormatException ex) {
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.BAD_REQUEST,
                        "assignedToUserId must be numeric"
                );
            }
        }

        throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST,
                "assignedToUserId has invalid type"
        );
    }

    private boolean parseNullableBoolean(Object value) {
        if (value == null) {
            return false;
        }

        if (value instanceof Boolean boolValue) {
            return boolValue;
        }

        if (value instanceof String textValue) {
            return Boolean.parseBoolean(textValue.trim());
        }

        return false;
    }

    private java.time.LocalDateTime parseDateTimeValue(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "date value is required"
            );
        }

        String normalized = rawValue.trim();
        if (normalized.length() == 10) {
            normalized += "T00:00:00";
        }

        try {
            return java.time.LocalDateTime.parse(normalized);
        } catch (java.time.format.DateTimeParseException ex) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "invalid date format"
            );
        }
    }

    private String requireNonBlank(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    fieldName + " is required"
            );
        }
        return value.trim();
    }

    private void storeAttachment(UrgentWorkOrder urgentWorkOrder, MultipartFile file) {
        String previousFilename = urgentWorkOrder.getAttachmentFilename();
        try {
            String originalFilename = file.getOriginalFilename();
            String ext = originalFilename != null && originalFilename.contains(".")
                    ? originalFilename.substring(originalFilename.lastIndexOf('.'))
                    : "";
            String storedFilename = java.util.UUID.randomUUID() + ext;
            java.nio.file.Path uploadDir = java.nio.file.Paths.get("uploads", "workorders");
            java.nio.file.Files.createDirectories(uploadDir);
            java.nio.file.Path filePath = uploadDir.resolve(storedFilename);
            file.transferTo(filePath);
            urgentWorkOrder.setAttachmentFilename(storedFilename);
            urgentWorkOrder.setAttachmentContentType(file.getContentType());
            urgentWorkOrder.setAttachmentDownloadUrl("/api/files/workorders/" + storedFilename);
            if (previousFilename != null && !previousFilename.isBlank() && !previousFilename.equals(storedFilename)) {
                deleteStoredAttachment(previousFilename);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to store file", e);
        }
    }

    private void clearAttachment(UrgentWorkOrder urgentWorkOrder) {
        String previousFilename = urgentWorkOrder.getAttachmentFilename();
        urgentWorkOrder.setAttachmentFilename(null);
        urgentWorkOrder.setAttachmentContentType(null);
        urgentWorkOrder.setAttachmentDownloadUrl(null);
        deleteStoredAttachment(previousFilename);
    }

    private void storeInvoice(UrgentWorkOrder urgentWorkOrder, MultipartFile file) {
        String previousFilename = urgentWorkOrder.getInvoiceFilename();
        try {
            String originalFilename = file.getOriginalFilename();
            String ext = originalFilename != null && originalFilename.contains(".")
                    ? originalFilename.substring(originalFilename.lastIndexOf('.'))
                    : "";
            String storedFilename = java.util.UUID.randomUUID() + ext;
            java.nio.file.Path uploadDir = java.nio.file.Paths.get("uploads", "workorders");
            java.nio.file.Files.createDirectories(uploadDir);
            java.nio.file.Path filePath = uploadDir.resolve(storedFilename);
            file.transferTo(filePath);
            urgentWorkOrder.setInvoiceFilename(storedFilename);
            urgentWorkOrder.setInvoiceContentType(file.getContentType());
            if (previousFilename != null && !previousFilename.isBlank() && !previousFilename.equals(storedFilename)) {
                deleteStoredAttachment(previousFilename);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to store invoice file", e);
        }
    }

    private void clearInvoice(UrgentWorkOrder urgentWorkOrder) {
        String previousFilename = urgentWorkOrder.getInvoiceFilename();
        urgentWorkOrder.setInvoiceFilename(null);
        urgentWorkOrder.setInvoiceContentType(null);
        deleteStoredAttachment(previousFilename);
    }

    private void deleteStoredAttachment(String filename) {
        if (filename == null || filename.isBlank()) {
            return;
        }
        try {
            java.nio.file.Files.deleteIfExists(java.nio.file.Paths.get("uploads", "workorders").resolve(filename));
        } catch (Exception ignored) {
            // Keep request successful even if stale file cannot be removed.
        }
    }

    private Long extractUserId(Authentication auth) {
        if (auth == null || auth.getDetails() == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED,
                    "unauthenticated"
            );
        }

        try {
            return Long.parseLong(auth.getDetails().toString());
        } catch (NumberFormatException ex) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED,
                    "invalid user id"
            );
        }
    }

    private List<UrgentWorkOrder> enrichDisplayNames(List<UrgentWorkOrder> workOrders) {
        if (workOrders == null || workOrders.isEmpty()) {
            return workOrders;
        }

        java.util.Set<Long> userIds = new java.util.HashSet<>();
        for (UrgentWorkOrder workOrder : workOrders) {
            if (workOrder.getCreatedByUserId() != null) {
                userIds.add(workOrder.getCreatedByUserId());
            }
            if (workOrder.getAssignedToUserId() != null) {
                userIds.add(workOrder.getAssignedToUserId());
            }
        }

        java.util.Map<Long, String> userNames = new java.util.HashMap<>();
        if (!userIds.isEmpty()) {
            userRepository.findAllById(userIds)
                    .forEach(user -> userNames.put(user.getId(), user.getEmail()));
        }

        for (UrgentWorkOrder workOrder : workOrders) {
            workOrder.setCreatedByName(userNames.get(workOrder.getCreatedByUserId()));
            workOrder.setAssignedToName(userNames.get(workOrder.getAssignedToUserId()));
        }

        return workOrders;
    }

    private UrgentWorkOrder enrichDisplayNames(UrgentWorkOrder workOrder) {
        if (workOrder == null) {
            return null;
        }

        enrichDisplayNames(java.util.List.of(workOrder));
        return workOrder;
    }
}
