package com.entretienbatiment.backend.modules.inventory.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record CountItemResponse(
        Long id,
        Long productId,
        String productSku,
        String productName,
        String productBarcode,
        String unit,
        String zone,
        BigDecimal expectedQty,
        BigDecimal countedQty,
        BigDecimal discrepancy,
        Long countedByUserId,
        String countedByName,
        String notes,
        Instant countedAt
) {}
