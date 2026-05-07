package com.entretienbatiment.backend.modules.jobs.controller;

import com.entretienbatiment.backend.modules.jobs.dto.JobStatusDto;
import com.entretienbatiment.backend.modules.jobs.service.JobService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dev/jobs")
public class JobController {

    @Autowired
    private JobService jobService;

    /** List all registered jobs with their current status. */
    @GetMapping
    @PreAuthorize("hasRole('DEVELOPPER')")
    public List<JobStatusDto> list() {
        return jobService.listAll();
    }

    /**
     * Manually trigger a job by ID.
     * Returns 409 if the job is already running or the ID is unknown.
     */
    @PostMapping("/{id}/trigger")
    @PreAuthorize("hasRole('DEVELOPPER')")
    public ResponseEntity<?> trigger(@PathVariable String id) {
        boolean started = jobService.triggerAsync(id);
        if (!started) {
            return ResponseEntity.status(409)
                    .body(Map.of("error", "Job is already running or not found: " + id));
        }
        return ResponseEntity.ok(
                jobService.listAll().stream()
                        .filter(j -> j.id().equals(id))
                        .findFirst()
                        .orElse(null));
    }
}
