package com.entretienbatiment.backend.modules.preventivemaintenance.controller;

import com.entretienbatiment.backend.modules.preventivemaintenance.dto.PreventiveTaskResponse;
import com.entretienbatiment.backend.modules.preventivemaintenance.service.PreventiveTaskService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/preventive-tasks")
@PreAuthorize("isAuthenticated()")
public class PreventiveTaskController {

    private final PreventiveTaskService service;

    public PreventiveTaskController(PreventiveTaskService service) {
        this.service = service;
    }

    @GetMapping
    public List<PreventiveTaskResponse> listAll() {
        return service.getAllTasks();
    }

    @PostMapping("/{taskId}/complete")
    @ResponseStatus(HttpStatus.CREATED)
    public PreventiveTaskResponse complete(@PathVariable Long taskId) {
        return service.completeTask(taskId);
    }

    @DeleteMapping("/{taskId}/completions/{completionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void uncomplete(@PathVariable Long taskId, @PathVariable Long completionId) {
        service.uncompleteTask(taskId, completionId);
    }
}
