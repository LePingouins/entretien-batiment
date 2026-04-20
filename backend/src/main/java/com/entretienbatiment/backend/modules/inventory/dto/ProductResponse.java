package com.entretienbatiment.backend.modules.inventory.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record ProductResponse(
        Long id,
        String sku,
        String name,
        Long categoryId,
        String categoryName,
        String unit,
        String barcode,
        BigDecimal expectedQty,
        String locationZone,
        String notes,
        boolean archived,
        Instant createdAt,
        Instant updatedAt
) {}
