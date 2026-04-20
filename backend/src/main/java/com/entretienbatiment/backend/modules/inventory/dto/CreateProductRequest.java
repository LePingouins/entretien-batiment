package com.entretienbatiment.backend.modules.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record CreateProductRequest(
        @NotBlank @Size(max = 60) String sku,
        @NotBlank @Size(max = 200) String name,
        Long categoryId,
        @Size(max = 30) String unit,
        @Size(max = 80) String barcode,
        BigDecimal expectedQty,
        @Size(max = 80) String locationZone,
        String notes
) {}
