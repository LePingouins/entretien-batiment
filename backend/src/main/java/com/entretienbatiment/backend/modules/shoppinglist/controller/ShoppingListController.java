package com.entretienbatiment.backend.modules.shoppinglist.controller;

import com.entretienbatiment.backend.modules.urgentworkorders.model.UrgentWorkOrderMaterial;
import com.entretienbatiment.backend.modules.urgentworkorders.repository.UrgentWorkOrderMaterialRepository;
import com.entretienbatiment.backend.modules.workorders.repository.WorkOrderMaterialRepository;
import com.entretienbatiment.backend.modules.workorders.model.WorkOrderMaterial;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/shopping-list")
@PreAuthorize("isAuthenticated()")
public class ShoppingListController {

    private final WorkOrderMaterialRepository woMaterialRepo;
    private final UrgentWorkOrderMaterialRepository urgentMaterialRepo;

    public ShoppingListController(
            WorkOrderMaterialRepository woMaterialRepo,
            UrgentWorkOrderMaterialRepository urgentMaterialRepo
    ) {
        this.woMaterialRepo = woMaterialRepo;
        this.urgentMaterialRepo = urgentMaterialRepo;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ShoppingListResponse getShoppingList() {

        List<ShoppingListItem> items = new ArrayList<>();

        // Regular work order materials (only from non-archived work orders)
        List<WorkOrderMaterial> woMaterials = woMaterialRepo.findAllNotArchived();
        for (WorkOrderMaterial m : woMaterials) {
            items.add(new ShoppingListItem(
                m.getId(),
                m.getName(),
                m.getQuantity(),
                m.getBought() != null && m.getBought(),
                m.getSupplier(),
                m.getUrl(),
                m.getDescription(),
                m.getWorkOrder().getId(),
                m.getWorkOrder().getTitle(),
                "REGULAR",
                m.getWorkOrder().getStatus().name()
            ));
        }

        // Urgent work order materials (only from non-archived urgent work orders)
        List<UrgentWorkOrderMaterial> urgentMaterials = urgentMaterialRepo.findAllNotArchived();
        for (UrgentWorkOrderMaterial m : urgentMaterials) {
            items.add(new ShoppingListItem(
                m.getId(),
                m.getName(),
                m.getQuantity(),
                m.getBought() != null && m.getBought(),
                m.getSupplier(),
                m.getUrl(),
                m.getDescription(),
                m.getUrgentWorkOrder().getId(),
                m.getUrgentWorkOrder().getTitle(),
                "URGENT",
                m.getUrgentWorkOrder().getStatus()
            ));
        }

        long totalCount = items.size();
        long boughtCount = items.stream().filter(ShoppingListItem::bought).count();
        long unboughtCount = totalCount - boughtCount;

        return new ShoppingListResponse(items, totalCount, boughtCount, unboughtCount);
    }

    public record ShoppingListItem(
            Long materialId,
            String name,
            Integer quantity,
            boolean bought,
            String supplier,
            String url,
            String description,
            Long workOrderId,
            String workOrderTitle,
            String workOrderType,
            String workOrderStatus
    ) {}

    public record ShoppingListResponse(
            List<ShoppingListItem> items,
            long totalCount,
            long boughtCount,
            long unboughtCount
    ) {}
}
