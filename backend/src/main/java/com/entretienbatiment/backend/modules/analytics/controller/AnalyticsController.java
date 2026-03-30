package com.entretienbatiment.backend.modules.analytics.controller;

import com.entretienbatiment.backend.modules.analytics.service.AnalyticsService;
import com.entretienbatiment.backend.modules.analytics.dto.AnalyticsStatsResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/analytics")
@PreAuthorize("@pageAccessService.canAccess(authentication, 'ANALYTICS')")
public class AnalyticsController {

    private final AnalyticsService service;

    public AnalyticsController(AnalyticsService service) {
        this.service = service;
    }

    @GetMapping
    public AnalyticsStatsResponse getStats() {
        return service.getStats();
    }
}
