package com.entretienbatiment.backend.modules.preventivemaintenance.dto;

import java.time.Instant;

public record PreventiveTaskResponse(
        Long id,
        String name,
        String frequency,
        String site,
        int displayOrder,
        boolean isDue,
        Instant lastCompletedAt,
        Long lastCompletionId,
        String lastCompletedByEmail
) {}
