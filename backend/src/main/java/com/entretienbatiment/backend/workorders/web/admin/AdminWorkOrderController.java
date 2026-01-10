package com.entretienbatiment.backend.workorders.web.admin;

import com.entretienbatiment.backend.workorders.web.admin.dto.UpdateWorkOrderRequest;
import com.entretienbatiment.backend.workorders.service.WorkOrderService;
import com.entretienbatiment.backend.workorders.web.admin.dto.AssignWorkOrderRequest;
import com.entretienbatiment.backend.workorders.web.admin.dto.CreateWorkOrderRequest;
import com.entretienbatiment.backend.workorders.web.admin.dto.WorkOrderResponse;
import com.entretienbatiment.backend.workorders.web.admin.dto.CreateWorkOrderMultipartRequest;
import org.springframework.http.MediaType;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.entretienbatiment.backend.workorders.domain.WorkOrderPriority;
import com.entretienbatiment.backend.workorders.domain.WorkOrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@RestController
@RequestMapping("/api/admin/work-orders")
public class AdminWorkOrderController {

    private final WorkOrderService service;

    public AdminWorkOrderController(WorkOrderService service) {
        this.service = service;
    }


    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public WorkOrderResponse createMultipart(
            @ModelAttribute CreateWorkOrderMultipartRequest req,
            Authentication auth
    ) {
        Long userId = extractUserId(auth);
        return service.createMultipart(req, userId);
    }

    // Keep the original JSON endpoint for backward compatibility (optional)
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public WorkOrderResponse create(@Valid @RequestBody CreateWorkOrderRequest req, Authentication auth) {
        Long userId = extractUserId(auth);
        return service.create(req, userId);
    }

//    @GetMapping
//    public List<WorkOrderResponse> listAllNoPaging() {
//        return service.listAll();
//    }

    @GetMapping("/{id}")
    public WorkOrderResponse getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @PatchMapping("/{id}/assign")
    public WorkOrderResponse assign(
            @PathVariable Long id,
            @Valid @RequestBody AssignWorkOrderRequest req
    ) {
        return service.assign(id, req);
    }

    @PatchMapping("/{id}/cancel")
    public WorkOrderResponse cancel(@PathVariable Long id) {
        return service.cancelAsAdmin(id);
    }

    @GetMapping
    public Page<WorkOrderResponse> listAll(
            @RequestParam(required = false) WorkOrderStatus status,
            @RequestParam(required = false) WorkOrderPriority priority,
            @RequestParam(required = false) Long assignedToUserId,
            @RequestParam(required = false) Long createdByUserId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String location,
            Pageable pageable
    ) {
        return service.listAllAdmin(status, priority, assignedToUserId, createdByUserId, q, location, pageable);
    }


    @PutMapping("/{id}")
    public WorkOrderResponse update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateWorkOrderRequest req
    ) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

        // Serve uploaded files
    // Moved to FilesController

    private Long extractUserId(Authentication auth) {
        if (auth == null) {
            throw new IllegalArgumentException("unauthenticated");
        }

        Object details = auth.getDetails(); // <-- userId stored here
        if (details == null) {
            throw new IllegalArgumentException("unauthenticated (missing userId)");
        }

        try {
            return Long.parseLong(details.toString());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("invalid userId in token");
        }
    }
}
