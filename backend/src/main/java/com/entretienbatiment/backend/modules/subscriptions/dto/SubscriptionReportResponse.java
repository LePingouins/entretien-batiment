package com.entretienbatiment.backend.modules.subscriptions.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record SubscriptionReportResponse(
    int totalSubscriptions,
    int activeSubscriptions,
    BigDecimal totalMonthlyCost,
    BigDecimal totalYearlyCost,
    int upcomingRenewals30d,
    int expiredCount,
    Map<String, BigDecimal> costByCategory,
    Map<String, Integer> countByCategory,
    Map<String, BigDecimal> costByBillingCycle,
    Map<String, Integer> countByStatus,
    List<SubscriptionResponse> upcomingRenewals
) {}
