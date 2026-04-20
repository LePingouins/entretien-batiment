package com.entretienbatiment.backend.modules.inventory.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotNull;

public record RecordCountRequest(
        @NotNull Long productId,
        @NotNull BigDecimal countedQty,
        String notes
) {}
