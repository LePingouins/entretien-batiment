package com.entretienbatiment.backend.urgentworkorders.web.admin;

import com.entretienbatiment.backend.urgentworkorders.service.UrgentWorkOrderMaterialService;
import com.entretienbatiment.backend.workorders.web.admin.dto.MaterialRequest;
import com.entretienbatiment.backend.workorders.web.admin.dto.MaterialResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/urgent-work-orders/{urgentWorkOrderId}/materials")
public class UrgentWorkOrderMaterialController {
    private final UrgentWorkOrderMaterialService service;

    public UrgentWorkOrderMaterialController(UrgentWorkOrderMaterialService service) {
        this.service = service;
    }

    @GetMapping
    public List<MaterialResponse> list(@PathVariable Long urgentWorkOrderId) {
        return service.listMaterials(urgentWorkOrderId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MaterialResponse add(@PathVariable Long urgentWorkOrderId, @RequestBody MaterialRequest req) {
        return service.addMaterial(urgentWorkOrderId, req);
    }

    @PatchMapping("/{materialId}")
    public MaterialResponse update(@PathVariable Long urgentWorkOrderId, @PathVariable Long materialId, @RequestBody MaterialRequest req) {
        return service.updateMaterial(urgentWorkOrderId, materialId, req);
    }

    @PatchMapping("/{materialId}/bought")
    public MaterialResponse toggleBought(@PathVariable Long urgentWorkOrderId, @PathVariable Long materialId, @RequestBody BoughtRequest req) {
        return service.toggleBought(urgentWorkOrderId, materialId, req.bought());
    }

    @DeleteMapping("/{materialId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long urgentWorkOrderId, @PathVariable Long materialId) {
        service.deleteMaterial(urgentWorkOrderId, materialId);
    }

    public record BoughtRequest(boolean bought) {}
}
