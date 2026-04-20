package com.entretienbatiment.backend.modules.inventory.dto;

import com.entretienbatiment.backend.modules.inventory.model.InventorySessionStatus;
import java.time.Instant;

public record SessionResponse(
        Long id,
        String name,
        InventorySessionStatus status,
        String notes,
        Instant startedAt,
        Instant completedAt,
        Long createdByUserId,
        String createdByName,
        int totalItems,
        int countedItems,
        int discrepancyCount,
        Instant createdAt,
        Instant updatedAt
) {}
