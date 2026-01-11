package com.entretienbatiment.backend.workorders.service;

import com.entretienbatiment.backend.workorders.data.WorkOrderMaterialRepository;
import com.entretienbatiment.backend.workorders.data.WorkOrderRepository;
import com.entretienbatiment.backend.workorders.domain.WorkOrder;
import com.entretienbatiment.backend.workorders.domain.WorkOrderMaterial;
import com.entretienbatiment.backend.workorders.web.admin.dto.MaterialRequest;
import com.entretienbatiment.backend.workorders.web.admin.dto.MaterialResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class WorkOrderMaterialService {
    private final WorkOrderRepository workOrderRepo;
    private final WorkOrderMaterialRepository materialRepo;

    public WorkOrderMaterialService(WorkOrderRepository workOrderRepo, WorkOrderMaterialRepository materialRepo) {
        this.workOrderRepo = workOrderRepo;
        this.materialRepo = materialRepo;
    }

    @Transactional(readOnly = true)
    public List<MaterialResponse> listMaterials(Long workOrderId) {
        WorkOrder wo = workOrderRepo.findById(workOrderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "work order not found"));
        return materialRepo.findByWorkOrderIdOrderByCreatedAtAsc(workOrderId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public MaterialResponse addMaterial(Long workOrderId, MaterialRequest req) {
        if (req.name() == null || req.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Material name required");
        }
        if (req.quantity() != null && req.quantity() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be >= 0");
        }
        WorkOrder wo = workOrderRepo.findById(workOrderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "work order not found"));
        WorkOrderMaterial mat = new WorkOrderMaterial(wo, req.name(), req.quantity(), req.url(), req.description(), req.supplier());
        return toResponse(materialRepo.save(mat));
    }

    @Transactional
    public MaterialResponse updateMaterial(Long workOrderId, Long materialId, MaterialRequest req) {
        WorkOrderMaterial mat = getMaterialOrThrow(workOrderId, materialId);
        if (req.name() != null && !req.name().isBlank()) mat.setName(req.name());
        if (req.quantity() != null) {
            if (req.quantity() < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be >= 0");
            mat.setQuantity(req.quantity());
        }
        if (req.url() != null) mat.setUrl(req.url().isBlank() ? null : req.url());
        if (req.description() != null) mat.setDescription(req.description().isBlank() ? null : req.description());
        if (req.supplier() != null) mat.setSupplier(req.supplier().isBlank() ? null : req.supplier());
        return toResponse(materialRepo.save(mat));
    }

    @Transactional
    public MaterialResponse toggleBought(Long workOrderId, Long materialId, boolean bought) {
        WorkOrderMaterial mat = getMaterialOrThrow(workOrderId, materialId);
        mat.setBought(bought);
        return toResponse(materialRepo.save(mat));
    }

    @Transactional
    public void deleteMaterial(Long workOrderId, Long materialId) {
        getMaterialOrThrow(workOrderId, materialId); // 404 if not found or not belonging
        materialRepo.deleteByIdAndWorkOrderId(materialId, workOrderId);
    }

    private WorkOrderMaterial getMaterialOrThrow(Long workOrderId, Long materialId) {
        WorkOrderMaterial mat = materialRepo.findById(materialId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "material not found"));
        if (!mat.getWorkOrder().getId().equals(workOrderId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "material does not belong to work order");
        }
        return mat;
    }

    private MaterialResponse toResponse(WorkOrderMaterial mat) {
        return new MaterialResponse(mat.getId(), mat.getName(), mat.getQuantity(), mat.getBought(), mat.getUrl(), mat.getDescription(), mat.getSupplier());
    }
}
