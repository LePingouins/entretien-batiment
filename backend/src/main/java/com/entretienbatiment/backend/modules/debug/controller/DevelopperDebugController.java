package com.entretienbatiment.backend.modules.debug.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
import com.entretienbatiment.backend.modules.debug.service.DevelopperDebugService;

@RestController
@RequestMapping("/api/developper/debug")
@PreAuthorize("hasRole('DEVELOPPER')")
public class DevelopperDebugController {

    private final DevelopperDebugService developperDebugService;

    public DevelopperDebugController(DevelopperDebugService developperDebugService) {
        this.developperDebugService = developperDebugService;
    }

    @GetMapping("/errors")
    public DevelopperDebugService.DevelopperDebugDashboardResponse getErrors(
            @RequestParam(defaultValue = "50") int limit
    ) {
        return developperDebugService.getDashboard(limit);
    }

    @GetMapping("/errors/{fingerprint}")
    public DevelopperDebugService.DevelopperDebugErrorDetailResponse getErrorDetail(
            @PathVariable String fingerprint
    ) {
        return developperDebugService.getErrorDetail(fingerprint);
    }

    @DeleteMapping("/errors/{fingerprint}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteError(@PathVariable String fingerprint) {
        developperDebugService.deleteByFingerprint(fingerprint);
    }

    @DeleteMapping("/errors")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAllErrors() {
        developperDebugService.deleteAll();
    }
}
