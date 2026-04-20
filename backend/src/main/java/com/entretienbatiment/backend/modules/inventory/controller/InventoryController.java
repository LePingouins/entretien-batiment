package com.entretienbatiment.backend.modules.inventory.controller;

import com.entretienbatiment.backend.modules.inventory.dto.*;
import com.entretienbatiment.backend.modules.inventory.service.InventoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService service;

    public InventoryController(InventoryService service) {
        this.service = service;
    }

    // ─── Categories ────────────────────────────────────────────────────────

    @GetMapping("/categories")
    public List<CategoryResponse> listCategories() {
        return service.listCategories();
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryResponse createCategory(@Valid @RequestBody CreateCategoryRequest req) {
        return service.createCategory(req);
    }

    @DeleteMapping("/categories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@PathVariable Long id) {
        service.deleteCategory(id);
    }

    // ─── Products ──────────────────────────────────────────────────────────

    @GetMapping("/products")
    public List<ProductResponse> listProducts(@RequestParam(required = false) String q) {
        if (q != null && !q.isBlank()) {
            return service.searchProducts(q.trim());
        }
        return service.listProducts();
    }

    @GetMapping("/products/{id}")
    public ProductResponse getProduct(@PathVariable Long id) {
        return service.getProduct(id);
    }

    @PostMapping("/products")
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse createProduct(@Valid @RequestBody CreateProductRequest req) {
        return service.createProduct(req);
    }

    @PatchMapping("/products/{id}")
    public ProductResponse updateProduct(@PathVariable Long id,
                                         @Valid @RequestBody UpdateProductRequest req) {
        return service.updateProduct(id, req);
    }

    @DeleteMapping("/products/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProduct(@PathVariable Long id) {
        service.deleteProduct(id);
    }

    @GetMapping("/zones")
    public List<String> getZones() {
        return service.getZones();
    }

    // ─── Count Sessions ────────────────────────────────────────────────────

    @GetMapping("/sessions")
    public List<SessionResponse> listSessions() {
        return service.listSessions();
    }

    @GetMapping("/sessions/{id}")
    public SessionResponse getSession(@PathVariable Long id) {
        return service.getSession(id);
    }

    @PostMapping("/sessions")
    @ResponseStatus(HttpStatus.CREATED)
    public SessionResponse createSession(@Valid @RequestBody CreateSessionRequest req,
                                         Authentication auth) {
        Long userId = Long.parseLong(auth.getDetails().toString());
        return service.createSession(req, userId);
    }

    @PatchMapping("/sessions/{id}/start")
    public SessionResponse startSession(@PathVariable Long id) {
        return service.startSession(id);
    }

    @PatchMapping("/sessions/{id}/complete")
    public SessionResponse completeSession(@PathVariable Long id) {
        return service.completeSession(id);
    }

    @PatchMapping("/sessions/{id}/cancel")
    public SessionResponse cancelSession(@PathVariable Long id) {
        return service.cancelSession(id);
    }

    @DeleteMapping("/sessions/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSession(@PathVariable Long id) {
        service.deleteSession(id);
    }

    // ─── Count Items (live counting) ───────────────────────────────────────

    @GetMapping("/sessions/{sessionId}/items")
    public List<CountItemResponse> getSessionItems(
            @PathVariable Long sessionId,
            @RequestParam(required = false) String zone,
            @RequestParam(required = false) String q) {
        return service.getSessionItems(sessionId, zone, q);
    }

    @PostMapping("/sessions/{sessionId}/count")
    public CountItemResponse recordCount(
            @PathVariable Long sessionId,
            @Valid @RequestBody RecordCountRequest req,
            Authentication auth) {
        Long userId = Long.parseLong(auth.getDetails().toString());
        return service.recordCount(sessionId, req, userId);
    }

    // ─── Export ────────────────────────────────────────────────────────────

    @GetMapping("/sessions/{sessionId}/export")
    public ResponseEntity<byte[]> exportCsv(@PathVariable Long sessionId) {
        String csv = service.exportSessionCsv(sessionId);
        byte[] bytes = csv.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=inventory-count-" + sessionId + ".csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .contentLength(bytes.length)
                .body(bytes);
    }
}
