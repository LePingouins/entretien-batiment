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
    public List<UrgentWorkOrder> getAll() {
        return service.findAll();
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
                java.nio.file.Path uploadDir = java.nio.file.Paths.get("uploads", "urgentworkorders");
                java.nio.file.Files.createDirectories(uploadDir);
                java.nio.file.Path filePath = uploadDir.resolve(storedFilename);
                file.transferTo(filePath);
                urgentWorkOrder.setAttachmentFilename(storedFilename);
                urgentWorkOrder.setAttachmentContentType(file.getContentType());
            } catch (Exception e) {
                throw new RuntimeException("Failed to store file", e);
            }
        }
        return service.save(urgentWorkOrder);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<UrgentWorkOrder> patchStatus(@PathVariable Long id, @RequestBody java.util.Map<String, Object> updates) {
        return service.findById(id)
                .map(existing -> {
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
}
