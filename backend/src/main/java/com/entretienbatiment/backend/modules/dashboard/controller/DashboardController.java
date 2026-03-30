package com.entretienbatiment.backend.modules.dashboard.controller;

import com.entretienbatiment.backend.modules.dashboard.service.DashboardService;
import com.entretienbatiment.backend.modules.dashboard.dto.DashboardResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/dashboard")
@PreAuthorize("@pageAccessService.canAccess(authentication, 'DASHBOARD')")
public class DashboardController {

    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    @GetMapping
    public DashboardResponse getDashboardStats() {
        return service.getDashboardStats();
    }
}
