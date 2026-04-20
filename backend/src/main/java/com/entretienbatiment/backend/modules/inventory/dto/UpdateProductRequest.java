package com.entretienbatiment.backend.modules.inventory.dto;

import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateProductRequest(
        @Size(max = 60) String sku,
        @Size(max = 200) String name,
        Long categoryId,
        @Size(max = 30) String unit,
        @Size(max = 80) String barcode,
        BigDecimal expectedQty,
        @Size(max = 80) String locationZone,
        String notes
) {}
