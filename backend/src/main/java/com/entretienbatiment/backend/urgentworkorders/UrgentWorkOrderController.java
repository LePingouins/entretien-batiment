package com.entretienbatiment.backend.urgentworkorders;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.RequestPart;
import java.util.List;

@RestController
@RequestMapping("/api/urgent-work-orders")
public class UrgentWorkOrderController {
    private final UrgentWorkOrderService service;

    public UrgentWorkOrderController(UrgentWorkOrderService service) {
        this.service = service;
    }

    @GetMapping
    public List<UrgentWorkOrder> getAll(@RequestParam(required = false) String q,
                                        @RequestParam(required = false) String status,
                                        @RequestParam(required = false) String location) {
        // If no filters, return all non-archived
        if (q == null && status == null && location == null) {
            return service.findAll();
        }
        return service.findAllActiveFiltered(q, status, location);
    }

    @GetMapping("/archived")
    public List<UrgentWorkOrder> getAllArchived(@RequestParam(required = false) String q,
                                                @RequestParam(required = false) String status,
                                                @RequestParam(required = false) String location) {
        return service.findAllArchived(q, status, location);
    }


    @GetMapping("/{id}")
    public ResponseEntity<UrgentWorkOrder> getById(@PathVariable Long id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping(consumes = {"multipart/form-data"})
    public UrgentWorkOrder create(
            @RequestPart("title") String title,
            @RequestPart("description") String description,
            @RequestPart("location") String location,
            @RequestPart(value = "dueDate", required = false) String dueDateStr,
            @RequestPart(value = "priority", required = false) String priority,
            @RequestPart(value = "status", required = false) String status,
            @RequestPart(value = "createdByUserId", required = false) Long createdByUserId,
            @RequestPart(value = "assignedToUserId", required = false) Long assignedToUserId,
            @RequestPart(value = "files", required = false) List<MultipartFile> files
    ) {
        UrgentWorkOrder urgentWorkOrder = new UrgentWorkOrder(title, description, location, status != null ? status : "IN_PROGRESS");
        urgentWorkOrder.setPriority(priority);
        urgentWorkOrder.setCreatedByUserId(createdByUserId);
        urgentWorkOrder.setAssignedToUserId(assignedToUserId);
        if (dueDateStr != null && !dueDateStr.isEmpty()) {
            urgentWorkOrder.setDueDate(java.time.LocalDateTime.parse(dueDateStr));
        }
        if (files != null && !files.isEmpty()) {
            MultipartFile file = files.get(0); // Only handle the first file for now
            try {
                String originalFilename = file.getOriginalFilename();
                String ext = originalFilename != null && originalFilename.contains(".") ? originalFilename.substring(originalFilename.lastIndexOf('.')) : "";
                String storedFilename = java.util.UUID.randomUUID() + ext;
                // Use same directory as regular work orders to reuse FilesController
                java.nio.file.Path uploadDir = java.nio.file.Paths.get("uploads", "workorders");
                java.nio.file.Files.createDirectories(uploadDir);
                java.nio.file.Path filePath = uploadDir.resolve(storedFilename);
                file.transferTo(filePath);
                urgentWorkOrder.setAttachmentFilename(storedFilename);
                urgentWorkOrder.setAttachmentContentType(file.getContentType());
                // Set download URL to point to existing FilesController endpoint
                urgentWorkOrder.setAttachmentDownloadUrl("/api/files/workorders/" + storedFilename);
            } catch (Exception e) {
                throw new RuntimeException("Failed to store file", e);
            }
        }
        return service.save(urgentWorkOrder);
    }

    @PatchMapping("/{id}")
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
                            // Accept both date and date-time strings
                            String dueDateStr = (String) dueDate;
                            if (dueDateStr.length() == 10) {
                                dueDateStr += "T00:00:00";
                            }
                            existing.setDueDate(java.time.LocalDateTime.parse(dueDateStr));
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
                    if (updates.containsKey("completedAt")) {
                        Object completedAt = updates.get("completedAt");
                        if (completedAt instanceof String && !((String) completedAt).isEmpty()) {
                            existing.setCompletedAt(java.time.LocalDateTime.parse((String) completedAt));
                        } else {
                            existing.setCompletedAt(null);
                        }
                    }
                    return ResponseEntity.ok(service.save(existing));
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
}
