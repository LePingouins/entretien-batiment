package com.entretienbatiment.backend.modules.subscriptions.dto;

import java.math.BigDecimal;

public record SubscriptionResponse(
    Long id,
    String name,
    String vendor,
    String category,
    BigDecimal cost,
    String currency,
    String billingCycle,
    String status,
    String startDate,
    String nextDueDate,
    boolean autoRenew,
    String websiteUrl,
    String contactEmail,
    String notes,
    BigDecimal monthlyCost,
    BigDecimal yearlyCost,
    String createdAt,
    String updatedAt
) {}
