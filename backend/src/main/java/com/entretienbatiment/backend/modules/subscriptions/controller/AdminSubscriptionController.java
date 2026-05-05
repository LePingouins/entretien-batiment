package com.entretienbatiment.backend.modules.subscriptions.controller;

import com.entretienbatiment.backend.modules.subscriptions.dto.SubscriptionReportResponse;
import com.entretienbatiment.backend.modules.subscriptions.dto.SubscriptionRequest;
import com.entretienbatiment.backend.modules.subscriptions.dto.SubscriptionResponse;
import com.entretienbatiment.backend.modules.subscriptions.service.SoftwareSubscriptionService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/subscriptions")
@PreAuthorize("@pageAccessService.canAccess(authentication, 'SUBSCRIPTIONS')")
public class AdminSubscriptionController {

    private final SoftwareSubscriptionService service;

    public AdminSubscriptionController(SoftwareSubscriptionService service) {
        this.service = service;
    }

    @GetMapping
    public List<SubscriptionResponse> listAll() {
        return service.listAll();
    }

    @GetMapping("/{id}")
    public SubscriptionResponse getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SubscriptionResponse create(@RequestBody SubscriptionRequest req) {
        return service.create(req);
    }

    @PutMapping("/{id}")
    public SubscriptionResponse update(@PathVariable Long id, @RequestBody SubscriptionRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @GetMapping("/report")
    public SubscriptionReportResponse getReport() {
        return service.getReport();
    }
}
