package com.entretienbatiment.backend.modules.subscriptions.dto;

import java.math.BigDecimal;

public record SubscriptionRequest(
    String name,
    String vendor,
    String category,
    BigDecimal cost,
    String currency,
    String billingCycle,
    String status,
    String startDate,
    String nextDueDate,
    Boolean autoRenew,
    String websiteUrl,
    String contactEmail,
    String notes
) {}
