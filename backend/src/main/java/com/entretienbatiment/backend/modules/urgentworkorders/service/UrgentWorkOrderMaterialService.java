package com.entretienbatiment.backend.modules.urgentworkorders.service;

import com.entretienbatiment.backend.modules.urgentworkorders.model.UrgentWorkOrder;
import com.entretienbatiment.backend.modules.urgentworkorders.repository.UrgentWorkOrderRepository;
import com.entretienbatiment.backend.modules.urgentworkorders.model.UrgentWorkOrderMaterial;
import com.entretienbatiment.backend.modules.urgentworkorders.repository.UrgentWorkOrderMaterialRepository;
import com.entretienbatiment.backend.modules.workorders.dto.MaterialRequest;
import com.entretienbatiment.backend.modules.workorders.dto.MaterialResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class UrgentWorkOrderMaterialService {
    private final UrgentWorkOrderRepository urgentWorkOrderRepo;
    private final UrgentWorkOrderMaterialRepository urgentMaterialRepo;

    public UrgentWorkOrderMaterialService(UrgentWorkOrderRepository urgentWorkOrderRepo, UrgentWorkOrderMaterialRepository urgentMaterialRepo) {
        this.urgentWorkOrderRepo = urgentWorkOrderRepo;
        this.urgentMaterialRepo = urgentMaterialRepo;
    }

    @Transactional(readOnly = true)
    public List<MaterialResponse> listMaterials(Long urgentWorkOrderId) {
        urgentWorkOrderRepo.findById(urgentWorkOrderId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "urgent work order not found"));
        return urgentMaterialRepo.findByUrgentWorkOrderIdOrderByCreatedAtAsc(urgentWorkOrderId)
            .stream().map(this::toResponse).toList();
    }

    @Transactional
    public MaterialResponse addMaterial(Long urgentWorkOrderId, MaterialRequest req) {
        if (req.name() == null || req.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Material name required");
        }
        if (req.quantity() != null && req.quantity() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be >= 0");
        }
        UrgentWorkOrder wo = urgentWorkOrderRepo.findById(urgentWorkOrderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "urgent work order not found"));
        UrgentWorkOrderMaterial mat = new UrgentWorkOrderMaterial(wo, req.name(), req.quantity(), req.url(), req.description(), req.supplier());
        MaterialResponse resp = toResponse(urgentMaterialRepo.save(mat));
        updateMaterialsCountAndPreview(wo);
        return resp;
    }

    @Transactional
    public MaterialResponse updateMaterial(Long urgentWorkOrderId, Long materialId, MaterialRequest req) {
        UrgentWorkOrderMaterial mat = getMaterialOrThrow(urgentWorkOrderId, materialId);
        if (req.name() != null && !req.name().isBlank()) mat.setName(req.name());
        if (req.quantity() != null) {
            if (req.quantity() < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be >= 0");
            mat.setQuantity(req.quantity());
        }
        if (req.url() != null) mat.setUrl(req.url().isBlank() ? null : req.url());
        if (req.description() != null) mat.setDescription(req.description().isBlank() ? null : req.description());
        if (req.supplier() != null) mat.setSupplier(req.supplier().isBlank() ? null : req.supplier());
        MaterialResponse resp = toResponse(urgentMaterialRepo.save(mat));
        updateMaterialsCountAndPreview(mat.getUrgentWorkOrder());
        return resp;
    }

    @Transactional
    public MaterialResponse toggleBought(Long urgentWorkOrderId, Long materialId, boolean bought) {
        UrgentWorkOrderMaterial mat = getMaterialOrThrow(urgentWorkOrderId, materialId);
        mat.setBought(bought);
        MaterialResponse resp = toResponse(urgentMaterialRepo.save(mat));
        updateMaterialsCountAndPreview(mat.getUrgentWorkOrder());
        return resp;
    }

    @Transactional
    public void deleteMaterial(Long urgentWorkOrderId, Long materialId) {
        UrgentWorkOrderMaterial mat = getMaterialOrThrow(urgentWorkOrderId, materialId); // 404 if not found or not belonging
        urgentMaterialRepo.deleteById(materialId);
        updateMaterialsCountAndPreview(mat.getUrgentWorkOrder());
    }

    // Update parent urgent work order's materialsCount and materialsPreview fields
    private void updateMaterialsCountAndPreview(UrgentWorkOrder wo) {
        List<UrgentWorkOrderMaterial> materials = urgentMaterialRepo.findByUrgentWorkOrderIdOrderByCreatedAtAsc(wo.getId());
        wo.setMaterialsCount(materials.size());
        String preview = materials.stream().limit(2).map(UrgentWorkOrderMaterial::getName).reduce((a, b) -> a + ", " + b).orElse("");
        wo.setMaterialsPreview(preview);
        urgentWorkOrderRepo.save(wo);
    }

    private UrgentWorkOrderMaterial getMaterialOrThrow(Long urgentWorkOrderId, Long materialId) {
        UrgentWorkOrderMaterial mat = urgentMaterialRepo.findById(materialId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "material not found"));
        if (!mat.getUrgentWorkOrder().getId().equals(urgentWorkOrderId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "material does not belong to urgent work order");
        }
        return mat;
    }

    private MaterialResponse toResponse(UrgentWorkOrderMaterial mat) {
        return new MaterialResponse(mat.getId(), mat.getName(), mat.getQuantity(), mat.getBought(), mat.getUrl(), mat.getDescription(), mat.getSupplier());
    }
}
