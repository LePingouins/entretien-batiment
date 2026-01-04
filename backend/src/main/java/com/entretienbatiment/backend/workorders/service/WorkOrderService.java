package com.entretienbatiment.backend.workorders.service;

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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

@Service
public class WorkOrderService {

    private final WorkOrderRepository repo;
    private final AppUserRepository users;

    public WorkOrderService(WorkOrderRepository repo, AppUserRepository users) {
        this.repo = repo;
        this.users = users;
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
            Pageable pageable
    ) {
        Specification<WorkOrder> spec = Specification.where(WorkOrderSpecifications.statusEquals(status))
                .and(WorkOrderSpecifications.priorityEquals(priority))
                .and(WorkOrderSpecifications.assignedToUserIdEquals(assignedToUserId))
                .and(WorkOrderSpecifications.createdByUserIdEquals(createdByUserId))
                .and(WorkOrderSpecifications.textSearch(q));

        return repo.findAll(spec, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<WorkOrderResponse> listForTech(Long techId, Pageable pageable) {
        // spec: assignedTo.id = techId
        Specification<WorkOrder> spec = (root, query, cb) -> cb.equal(root.get("assignedTo").get("id"), techId);
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
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        WorkOrder wo = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "work order not found"));
        repo.delete(wo);
    }

    private WorkOrderResponse toResponse(WorkOrder wo) {
        Long createdById = wo.getCreatedBy() != null ? wo.getCreatedBy().getId() : null;
        Long assignedToId = wo.getAssignedTo() != null ? wo.getAssignedTo().getId() : null;

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
                wo.getUpdatedAt()
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
