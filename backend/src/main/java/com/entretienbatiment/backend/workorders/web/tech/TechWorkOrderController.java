package com.entretienbatiment.backend.workorders.web.tech;

import com.entretienbatiment.backend.security.CurrentUser;
import com.entretienbatiment.backend.workorders.service.WorkOrderService;
import com.entretienbatiment.backend.workorders.web.admin.dto.WorkOrderResponse;
import com.entretienbatiment.backend.workorders.web.tech.dto.UpdateWorkOrderStatusRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.entretienbatiment.backend.workorders.web.tech.dto.TechWorkOrderSummaryResponse;

@RestController
@RequestMapping("/api/tech/work-orders")
public class TechWorkOrderController {

    private final WorkOrderService service;
    private final CurrentUser currentUser;

    public TechWorkOrderController(
            WorkOrderService service,
            CurrentUser currentUser
    ) {
        this.service = service;
        this.currentUser = currentUser;
    }

//    @GetMapping
//    public List<WorkOrderResponse> listMineNoPaging() {
//        Long techId = currentUser.userIdRequired();
//        return service.listForTech(techId);
//    }

    @GetMapping("/{id}")
    public WorkOrderResponse getMine(@PathVariable Long id) {
        Long techId = currentUser.userIdRequired();
        return service.getForTech(id, techId);
    }

    @PatchMapping("/{id}/status")
    public WorkOrderResponse updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateWorkOrderStatusRequest req
    ) {
        Long techId = currentUser.userIdRequired();
        return service.updateStatusForTech(id, techId, req.status());
    }

    @GetMapping
    public Page<WorkOrderResponse> listMine(Pageable pageable) {
        Long techId = currentUser.userIdRequired();
        return service.listForTech(techId, pageable);
    }

    @GetMapping("/summary")
    public TechWorkOrderSummaryResponse summary() {
        Long techId = currentUser.userIdRequired();
        return service.summaryForTech(techId);
    }
}
