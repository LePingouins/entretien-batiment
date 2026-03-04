
package com.entretienbatiment.backend.workorders.service;

import com.entretienbatiment.backend.workorders.web.admin.dto.CreateWorkOrderMultipartRequest;
import org.springframework.web.multipart.MultipartFile;
import com.entretienbatiment.backend.auth.AppUser;
import com.entretienbatiment.backend.auth.AppUserRepository;
import com.entretienbatiment.backend.workorders.data.WorkOrderRepository;
import com.entretienbatiment.backend.workorders.domain.WorkOrder;
import com.entretienbatiment.backend.workorders.web.admin.dto.AssignWorkOrderRequest;
import com.entretienbatiment.backend.workorders.web.admin.dto.CreateWorkOrderRequest;
import com.entretienbatiment.backend.workorders.web.admin.dto.WorkOrderResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.entretienbatiment.backend.workorders.domain.WorkOrderStatus;
import com.entretienbatiment.backend.workorders.domain.WorkOrderPriority;
import com.entretienbatiment.backend.notifications.NotificationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

@Service
public class WorkOrderService {

    private final WorkOrderRepository repo;
    private final AppUserRepository users;
    private final NotificationService notificationService;
    private final WorkOrderReminderScheduler reminderScheduler;

    public WorkOrderService(WorkOrderRepository repo, AppUserRepository users, NotificationService notificationService, WorkOrderReminderScheduler reminderScheduler) {
        this.repo = repo;
        this.users = users;
        this.notificationService = notificationService;
        this.reminderScheduler = reminderScheduler;
    }

    @Transactional
    public WorkOrderResponse create(CreateWorkOrderRequest req, Long createdByUserId) {
        AppUser creator = users.findById(createdByUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "createdBy user not found"));

        WorkOrder saved = repo.save(new WorkOrder(
                req.title(),
                req.description(),
                req.location(),
                req.priority(),
                creator,
                req.requestedDate(),
                req.dueDate()
        ));

        // Assign sortIndex for proper Kanban positioning based on priority
        assignSortIndexForNewWorkOrder(saved);

        // Notify Admins
        notificationService.notifyAdmins(
                "New Work Order Created",
                "Work order \"" + saved.getTitle() + "\" was successfully created.",
                "/admin/work-orders/" + saved.getId(),
                "workorder-create"
        );

        reminderScheduler.checkAndSendReminder(saved);

        return toResponse(saved);
    }

    @Transactional
    public WorkOrderResponse assign(Long workOrderId, AssignWorkOrderRequest req) {
        WorkOrder wo = repo.findById(workOrderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "work order not found"));

        // ✅ Enforce OPEN -> ASSIGNED only (and block terminal states, etc.)
        WorkOrderStatusRules.validateAdminAssign(wo.getStatus());

        AppUser tech = users.findById(req.techUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "tech user not found"));

        // role check (DB role is ADMIN/TECH)
        if (tech.getRole() == null || !"TECH".equalsIgnoreCase(tech.getRole().name())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "user is not a TECH");
        }
        if (!tech.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tech user is disabled");
        }

        wo.assignTo(tech);
        WorkOrder saved = repo.save(wo);

        reminderScheduler.checkAndSendReminder(saved);

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<WorkOrderResponse> listAll() {
        return repo.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public WorkOrderResponse getById(Long id) {
        WorkOrder wo = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "work order not found"));
        return toResponse(wo);
    }

    @Transactional
    public WorkOrderResponse cancelAsAdmin(Long id) {
        WorkOrder wo = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "work order not found"
                ));

        WorkOrderStatusRules.validateAdminCancel(wo.getStatus());

        wo.changeStatus(WorkOrderStatus.CANCELLED);
        WorkOrder saved = repo.save(wo);
        return toResponse(saved);
    }

    // ==================== KANBAN ORDERING METHODS ====================

    /**
     * Get all work orders for a specific status column, ordered for Kanban display.
     * 
     * ORDERING RULES:
     * 1. Items with non-null sortIndex come first, ordered by sortIndex ASC
     * 2. Items with null sortIndex come after, ordered by priority DESC, then createdAt DESC
     */
    @Transactional(readOnly = true)
    public List<WorkOrderResponse> listByStatusForKanban(WorkOrderStatus status) {
        return repo.findByStatusOrderedForKanban(status.name()).stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Reorder work orders within a single status column.
     * Sets sortIndex = array index for each id in orderedIds.
     * 
     * Used when dragging a card within the same column.
     */
    @Transactional
    public void reorderWorkOrdersInColumn(WorkOrderStatus status, List<Long> orderedIds) {
        // Fetch all work orders by IDs
        List<WorkOrder> workOrders = repo.findByIdIn(orderedIds);

        // Validate: all IDs must belong to the specified status
        for (WorkOrder wo : workOrders) {
            if (wo.getStatus() != status) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Work order " + wo.getId() + " does not belong to status " + status
                );
            }
        }

        // Validate: all orderedIds must be found
        if (workOrders.size() != orderedIds.size()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Some work order IDs were not found"
            );
        }

        // Create a map for quick lookup
        java.util.Map<Long, WorkOrder> woMap = workOrders.stream()
                .collect(java.util.stream.Collectors.toMap(WorkOrder::getId, wo -> wo));

        // Set sortIndex = array index
        for (int i = 0; i < orderedIds.size(); i++) {
            WorkOrder wo = woMap.get(orderedIds.get(i));
            if (wo != null) {
                wo.setSortIndex(i);
            }
        }

        repo.saveAll(workOrders);
    }

    /**
     * Move a work order to a different status column at a specific index.
     * Updates the status and assigns sortIndex at the new position.
     * Re-compacts sortIndex in both source and destination columns.
     * 
     * Used when dragging a card from one column to another.
     */
    @Transactional
    public WorkOrderResponse moveWorkOrder(Long workOrderId, WorkOrderStatus newStatus, int newIndex) {
        WorkOrder wo = repo.findById(workOrderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "work order not found"));

        WorkOrderStatus oldStatus = wo.getStatus();

        // Update status
        wo.setStatus(newStatus);

        // Get all items in the destination column (ordered for Kanban)
        List<WorkOrder> destColumnItems = repo.findByStatusOrderedForKanban(newStatus.name());

        // Remove the moved item if it's already in the list (same column move edge case)
        destColumnItems.removeIf(w -> w.getId().equals(workOrderId));

        // Clamp newIndex to valid range
        int insertIndex = Math.min(Math.max(0, newIndex), destColumnItems.size());

        // Insert the moved item at the new position
        destColumnItems.add(insertIndex, wo);

        // Re-compact sortIndex for destination column (0..N-1)
        for (int i = 0; i < destColumnItems.size(); i++) {
            destColumnItems.get(i).setSortIndex(i);
        }

        repo.saveAll(destColumnItems);

        // If moving across columns, re-compact the source column
        if (oldStatus != newStatus) {
            List<WorkOrder> sourceColumnItems = repo.findByStatusOrderedForKanban(oldStatus.name());
            for (int i = 0; i < sourceColumnItems.size(); i++) {
                sourceColumnItems.get(i).setSortIndex(i);
            }
            repo.saveAll(sourceColumnItems);
        }

        return toResponse(wo);
    }

    /**
     * Calculate the appropriate sortIndex for a new work order based on priority.
     * Inserts the new item at the correct position without reshuffling existing manually-ordered cards.
     * 
     * ALGORITHM:
     * 1. Get all items in the column (including the newly created one)
     * 2. Remove the new item from the list (it was already saved with sortIndex = null)
     * 3. Find the correct position based on priority
     * 4. Insert the new item at that position
     * 5. Re-compact all sortIndex values (0..N-1)
     */
    @Transactional
    public void assignSortIndexForNewWorkOrder(WorkOrder wo) {
        List<WorkOrder> columnItems = new java.util.ArrayList<>(
            repo.findByStatusOrderedForKanban(wo.getStatus().name())
        );

        // Remove the new work order from the list if it's already there
        // (it was just saved with sortIndex = null)
        columnItems.removeIf(item -> item.getId().equals(wo.getId()));

        // If the column is empty (no other items), assign sortIndex = 0
        if (columnItems.isEmpty()) {
            wo.setSortIndex(0);
            repo.save(wo);
            return;
        }

        // Find the position where this work order should be inserted based on priority
        // Priority order: URGENT (0) > HIGH (1) > MEDIUM (2) > LOW (3)
        int priorityRank = getPriorityRank(wo.getPriority());
        int insertIndex = columnItems.size(); // default: end of list

        for (int i = 0; i < columnItems.size(); i++) {
            WorkOrder existing = columnItems.get(i);
            int existingRank = getPriorityRank(existing.getPriority());

            // If existing item has lower priority, insert before it
            if (existingRank > priorityRank) {
                insertIndex = i;
                break;
            }
            // If same priority, insert after items created before this one (newer items first)
            if (existingRank == priorityRank && existing.getCreatedAt().isBefore(wo.getCreatedAt())) {
                // Continue looking - we want to insert after older items with same priority
                continue;
            }
            if (existingRank == priorityRank && existing.getCreatedAt().isAfter(wo.getCreatedAt())) {
                insertIndex = i;
                break;
            }
        }

        // Insert at the calculated position and re-compact all sortIndex values
        columnItems.add(insertIndex, wo);
        for (int i = 0; i < columnItems.size(); i++) {
            columnItems.get(i).setSortIndex(i);
        }
        repo.saveAll(columnItems);
    }

    /**
     * Get priority rank for ordering (lower = higher priority).
     */
    private int getPriorityRank(WorkOrderPriority priority) {
        return switch (priority) {
            case URGENT -> 0;
            case HIGH -> 1;
            case MEDIUM -> 2;
            case LOW -> 3;
        };
    }

    /**
     * Reorder ALL work orders in EVERY column by priority.
     * This resets any manual ordering and organizes all cards by priority
     * (URGENT first, then HIGH, MEDIUM, LOW).
     * Within the same priority, items are ordered by createdAt DESC (newest first).
     */
    @Transactional
    public void reorderAllByPriority() {
        // Process each status column
        for (WorkOrderStatus status : WorkOrderStatus.values()) {
            List<WorkOrder> columnItems = repo.findByStatusOrderedForKanban(status.name());
            
            if (columnItems.isEmpty()) {
                continue;
            }
            
            // Sort by priority rank ASC, then by createdAt DESC (newest first)
            columnItems.sort((a, b) -> {
                int rankA = getPriorityRank(a.getPriority());
                int rankB = getPriorityRank(b.getPriority());
                if (rankA != rankB) {
                    return Integer.compare(rankA, rankB);
                }
                // Same priority: newer items first
                return b.getCreatedAt().compareTo(a.getCreatedAt());
            });
            
            // Assign sortIndex (0..N-1)
            for (int i = 0; i < columnItems.size(); i++) {
                columnItems.get(i).setSortIndex(i);
            }
            
            repo.saveAll(columnItems);
        }
    }

    // ==================== END KANBAN ORDERING METHODS ====================

    @Transactional
    public WorkOrderResponse updateStatusForTech(
            Long id,
            Long techId,
            WorkOrderStatus nextStatus
    ) {
        WorkOrder wo = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "work order not found"
                ));

        if (wo.getAssignedTo() == null || !techId.equals(wo.getAssignedTo().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "not assigned to you");
        }

        // ✅ STRICT transition rules
        WorkOrderStatusRules.validateTechUpdate(wo.getStatus(), nextStatus);

        wo.changeStatus(nextStatus);
        WorkOrder saved = repo.save(wo);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<WorkOrderResponse> listForTech(Long techId) {
        return repo.findByAssignedTo_IdOrderByCreatedAtDesc(techId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public WorkOrderResponse getForTech(Long id, Long techId) {
        WorkOrder wo = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "work order not found"
                ));

        if (wo.getAssignedTo() == null || !techId.equals(wo.getAssignedTo().getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "not assigned to you"
            );
        }

        return toResponse(wo);
    }

    @Transactional(readOnly = true)
    public Page<WorkOrderResponse> listAllAdmin(
            WorkOrderStatus status,
            WorkOrderPriority priority,
            Long assignedToUserId,
            Long createdByUserId,
            String q,
            String location,
            Pageable pageable
    ) {
        // By default, exclude archived work orders from the main admin view
        Specification<WorkOrder> spec = Specification.where(WorkOrderSpecifications.statusEquals(status))
                .and(WorkOrderSpecifications.priorityEquals(priority))
                .and(WorkOrderSpecifications.assignedToUserIdEquals(assignedToUserId))
                .and(WorkOrderSpecifications.createdByUserIdEquals(createdByUserId))
                .and(WorkOrderSpecifications.textSearch(q))
                .and(WorkOrderSpecifications.locationEquals(location))
                .and(WorkOrderSpecifications.notArchived());

        return repo.findAll(spec, pageable).map(this::toResponse);
    }

    /**
     * List archived work orders with optional filters.
     */
    @Transactional(readOnly = true)
    public Page<WorkOrderResponse> listArchivedAdmin(
            WorkOrderStatus status,
            WorkOrderPriority priority,
            String q,
            String location,
            Pageable pageable
    ) {
        Specification<WorkOrder> spec = Specification.where(WorkOrderSpecifications.statusEquals(status))
                .and(WorkOrderSpecifications.priorityEquals(priority))
                .and(WorkOrderSpecifications.textSearch(q))
                .and(WorkOrderSpecifications.locationEquals(location))
                .and(WorkOrderSpecifications.archivedEquals(true));

        return repo.findAll(spec, pageable).map(this::toResponse);
    }

    /**
     * Archive old completed/cancelled work orders.
     * Called by a scheduled job.
     */
    @Transactional
    public int archiveOldWorkOrders() {
        // ╔════════════════════════════════════════════════════════════════════════════╗
        // ║  ARCHIVE TIME SETTING                                                       ║
        // ║  Change the value and unit below to control how long work orders stay      ║
        // ║  in COMPLETED/CANCELLED before being archived.                              ║
        // ║                                                                             ║
        // ║  Examples:                                                                  ║
        // ║    - 3 MONTHS (quarterly): .minus(90, ChronoUnit.DAYS)                     ║
        // ║    - 7 DAYS (production): .minus(7, ChronoUnit.DAYS)                       ║
        // ║    - 1 MINUTE (testing):  .minus(1, ChronoUnit.MINUTES)                    ║
        // ║    - 1 HOUR:              .minus(1, ChronoUnit.HOURS)                      ║
        // ╚════════════════════════════════════════════════════════════════════════════╝
        // Archive items older than 3 months (approx 90 days)
        java.time.Instant cutoffTime = java.time.Instant.now().minus(90, java.time.temporal.ChronoUnit.DAYS);
        List<WorkOrder> toArchive = repo.findWorkOrdersToArchive(
            List.of(WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED),
            cutoffTime
        );

        java.time.Instant now = java.time.Instant.now();
        for (WorkOrder wo : toArchive) {
            wo.setArchived(true);
            wo.setArchivedAt(now);
        }

        if (!toArchive.isEmpty()) {
            repo.saveAll(toArchive);
        }

        return toArchive.size();
    }

    /**
     * Manually archive a work order.
     */
    @Transactional
    public WorkOrderResponse archiveWorkOrder(Long id) {
        WorkOrder wo = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "work order not found"));

        if (wo.isArchived()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "work order is already archived");
        }

        wo.setArchived(true);
        wo.setArchivedAt(java.time.Instant.now());
        WorkOrder saved = repo.save(wo);
        return toResponse(saved);
    }

    /**
     * Unarchive a work order (restore from archive).
     */
    @Transactional
    public WorkOrderResponse unarchiveWorkOrder(Long id) {
        WorkOrder wo = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "work order not found"));

        if (!wo.isArchived()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "work order is not archived");
        }

        wo.setArchived(false);
        wo.setArchivedAt(null);
        WorkOrder saved = repo.save(wo);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<WorkOrderResponse> listForTech(Long techId, Pageable pageable) {
        // spec: assignedTo.id = techId, exclude archived
        Specification<WorkOrder> techSpec = (root, query, cb) -> cb.equal(root.get("assignedTo").get("id"), techId);
        Specification<WorkOrder> spec = Specification.where(techSpec)
                .and(WorkOrderSpecifications.notArchived());
        return repo.findAll(spec, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public com.entretienbatiment.backend.workorders.web.tech.dto.TechWorkOrderSummaryResponse summaryForTech(Long techId) {
        long assigned = repo.countByAssignedTo_IdAndStatus(techId, WorkOrderStatus.ASSIGNED);
        long inProgress = repo.countByAssignedTo_IdAndStatus(techId, WorkOrderStatus.IN_PROGRESS);
        long completed = repo.countByAssignedTo_IdAndStatus(techId, WorkOrderStatus.COMPLETED);

        return new com.entretienbatiment.backend.workorders.web.tech.dto.TechWorkOrderSummaryResponse(
                assigned, inProgress, completed
        );
    }

    @Transactional
    public WorkOrderResponse update(Long id, com.entretienbatiment.backend.workorders.web.admin.dto.UpdateWorkOrderRequest req) {
        WorkOrder wo = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "work order not found"));

        wo.setTitle(req.title());
        wo.setDescription(req.description());
        wo.setLocation(req.location());
        if (req.priority() != null) wo.setPriority(req.priority());
        // Only update status if provided, otherwise preserve current status
        if (req.status() != null) {
            wo.setStatus(req.status());
        }
        if (req.dueDate() != null) wo.setDueDate(req.dueDate());

        WorkOrder saved = repo.save(wo);
        reminderScheduler.checkAndSendReminder(saved);
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        WorkOrder wo = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "work order not found"));
        repo.delete(wo);
    }

    @Transactional
    public WorkOrderResponse createMultipart(CreateWorkOrderMultipartRequest req, Long createdByUserId) {
        AppUser creator = users.findById(createdByUserId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "createdBy user not found"));

        String attachmentFilename = null;
        String attachmentContentType = null;
        if (req.getFiles() != null && !req.getFiles().isEmpty()) {
            MultipartFile file = req.getFiles().get(0); // Only handle the first file for now
            try {
                String originalFilename = file.getOriginalFilename();
                String ext = originalFilename != null && originalFilename.contains(".") ? originalFilename.substring(originalFilename.lastIndexOf('.')) : "";
                String storedFilename = java.util.UUID.randomUUID() + ext;
                java.nio.file.Path uploadDir = java.nio.file.Paths.get("uploads", "workorders");
                java.nio.file.Files.createDirectories(uploadDir);
                java.nio.file.Path filePath = uploadDir.resolve(storedFilename);
                file.transferTo(filePath);
                attachmentFilename = storedFilename;
                attachmentContentType = file.getContentType();
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store file", e);
            }
        }

        WorkOrder workOrder = new WorkOrder(
            req.getTitle(),
            req.getDescription(),
            req.getLocation(),
            req.getPriority(),
            creator,
            req.getRequestedDate(),
            req.getDueDate()
        );
        workOrder.setAttachmentFilename(attachmentFilename);
        workOrder.setAttachmentContentType(attachmentContentType);
        WorkOrder saved = repo.save(workOrder);

        // Assign sortIndex for proper Kanban positioning based on priority
        assignSortIndexForNewWorkOrder(saved);

        notificationService.notifyAdmins(
            "New Work Order Created",
            "A new base work order '" + saved.getTitle() + "' was triggered.",
            "/admin/work-orders/" + saved.getId(),
            "workorder-create"
        );
        reminderScheduler.checkAndSendReminder(saved);
        // Return response with attachment info
        return toResponseWithAttachment(saved, attachmentFilename, attachmentContentType);
    }
    // Helper to build response with attachment info
    private WorkOrderResponse toResponseWithAttachment(WorkOrder wo, String attachmentFilename, String attachmentContentType) {
        Long createdById = wo.getCreatedBy() != null ? wo.getCreatedBy().getId() : null;
        Long assignedToId = wo.getAssignedTo() != null ? wo.getAssignedTo().getId() : null;
        String downloadUrl = (attachmentFilename != null)
            ? "/api/files/workorders/" + attachmentFilename
            : null;
        // Materials count and preview (first 2 names)
        Integer materialsCount = null;
        java.util.List<String> materialsPreview = null;
        try {
            java.util.List<com.entretienbatiment.backend.workorders.domain.WorkOrderMaterial> materials = wo.getMaterials();
            if (materials != null) {
                materialsCount = materials.size();
                materialsPreview = materials.stream().limit(2).map(m -> m.getName()).toList();
            }
        } catch (Exception e) {
            // fallback: leave as null
        }
        return new com.entretienbatiment.backend.workorders.web.admin.dto.WorkOrderResponse(
            wo.getId(),
            wo.getTitle(),
            wo.getDescription(),
            wo.getLocation(),
            wo.getPriority(),
            wo.getStatus(),
            createdById,
            assignedToId,
            wo.getRequestedDate(),
            wo.getDueDate(),
            wo.getCreatedAt(),
            wo.getUpdatedAt(),
            attachmentFilename,
            attachmentContentType,
            downloadUrl,
            materialsCount,
            materialsPreview,
            wo.getSortIndex(),
            wo.isArchived(),
            wo.getArchivedAt()
        );
    }
    

    private WorkOrderResponse toResponse(WorkOrder wo) {
        Long createdById = wo.getCreatedBy() != null ? wo.getCreatedBy().getId() : null;
        Long assignedToId = wo.getAssignedTo() != null ? wo.getAssignedTo().getId() : null;
        String attachmentFilename = null;
        String attachmentContentType = null;
        String downloadUrl = null;
        try {
            java.lang.reflect.Method getAttachmentFilename = wo.getClass().getMethod("getAttachmentFilename");
            java.lang.reflect.Method getAttachmentContentType = wo.getClass().getMethod("getAttachmentContentType");
            attachmentFilename = (String) getAttachmentFilename.invoke(wo);
            attachmentContentType = (String) getAttachmentContentType.invoke(wo);
            if (attachmentFilename != null) {
                downloadUrl = "/api/files/workorders/" + attachmentFilename;
            }
        } catch (Exception e) {
            // fallback: leave as null
        }
        // Materials count and preview (first 2 names)
        Integer materialsCount = null;
        java.util.List<String> materialsPreview = null;
        try {
            java.util.List<com.entretienbatiment.backend.workorders.domain.WorkOrderMaterial> materials = wo.getMaterials();
            if (materials != null) {
                materialsCount = materials.size();
                materialsPreview = materials.stream().limit(2).map(m -> m.getName()).toList();
            }
        } catch (Exception e) {
            // fallback: leave as null
        }
        return new WorkOrderResponse(
            wo.getId(),
            wo.getTitle(),
            wo.getDescription(),
            wo.getLocation(),
            wo.getPriority(),
            wo.getStatus(),
            createdById,
            assignedToId,
            wo.getRequestedDate(),
            wo.getDueDate(),
            wo.getCreatedAt(),
            wo.getUpdatedAt(),
            attachmentFilename,
            attachmentContentType,
            downloadUrl,
            materialsCount,
            materialsPreview,
            wo.getSortIndex(),
            wo.isArchived(),
            wo.getArchivedAt()
        );
    }

    // Optional: keep these helpers (now fixed with details=userId)
    private AppUser requireCurrentUser() {
        Long userId = currentUserIdOrNull();
        if (userId == null) throw new IllegalArgumentException("unauthenticated");

        return users.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("current user not found"));
    }

    private Long currentUserIdOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;

        Object details = auth.getDetails(); // ✅ userId stored here
        if (details == null) return null;

        try {
            return Long.parseLong(details.toString());
        } catch (Exception e) {
            return null;
        }
    }
}
