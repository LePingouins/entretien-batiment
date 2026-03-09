package com.entretienbatiment.backend.debug;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
}
