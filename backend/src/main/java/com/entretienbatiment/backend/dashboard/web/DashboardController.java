package com.entretienbatiment.backend.dashboard.web;

import com.entretienbatiment.backend.dashboard.service.DashboardService;
import com.entretienbatiment.backend.dashboard.web.dto.DashboardResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/dashboard")
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
