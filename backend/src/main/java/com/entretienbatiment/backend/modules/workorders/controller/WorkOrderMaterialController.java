package com.entretienbatiment.backend.modules.workorders.controller;

import com.entretienbatiment.backend.modules.workorders.service.WorkOrderMaterialService;
import com.entretienbatiment.backend.modules.workorders.dto.MaterialRequest;
import com.entretienbatiment.backend.modules.workorders.dto.MaterialResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/work-orders/{workOrderId}/materials")
@PreAuthorize("@pageAccessService.canAccess(authentication, 'WORK_ORDERS')")
public class WorkOrderMaterialController {
    private final WorkOrderMaterialService service;

    public WorkOrderMaterialController(WorkOrderMaterialService service) {
        this.service = service;
    }

    @GetMapping
    public List<MaterialResponse> list(@PathVariable Long workOrderId) {
        return service.listMaterials(workOrderId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MaterialResponse add(@PathVariable Long workOrderId, @RequestBody MaterialRequest req) {
        return service.addMaterial(workOrderId, req);
    }

    @PatchMapping("/{materialId}")
    public MaterialResponse update(@PathVariable Long workOrderId, @PathVariable Long materialId, @RequestBody MaterialRequest req) {
        return service.updateMaterial(workOrderId, materialId, req);
    }

    @PatchMapping("/{materialId}/bought")
    public MaterialResponse toggleBought(@PathVariable Long workOrderId, @PathVariable Long materialId, @RequestBody BoughtRequest req) {
        return service.toggleBought(workOrderId, materialId, req.bought());
    }

    @DeleteMapping("/{materialId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long workOrderId, @PathVariable Long materialId) {
        service.deleteMaterial(workOrderId, materialId);
    }

    public record BoughtRequest(boolean bought) {}
}
