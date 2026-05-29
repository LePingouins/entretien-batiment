package com.entretienbatiment.backend.modules.expenses.dto;

import java.time.LocalDate;

/**
 * Request body for creating or updating an expense (JSON only).
 * Receipt photo uploads use the separate multipart endpoint
 * {@code POST /api/expenses/{id}/receipts}.
 */
public record ExpenseRequest(
        LocalDate date,
        String supplier,
        String description,
        String province,
        String imputationCode,
        Long subtotalCents,
        Long tpsCents,
        Long tvqCents,
        Long tvhCents,
        Long tipCents,
        Long totalCents,
        String notes
) {}
