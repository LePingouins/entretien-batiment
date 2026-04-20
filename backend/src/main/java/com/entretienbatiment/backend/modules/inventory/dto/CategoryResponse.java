package com.entretienbatiment.backend.modules.inventory.dto;

import java.time.Instant;

public record CategoryResponse(
        Long id,
        String name,
        Instant createdAt
) {}
