package com.entretienbatiment.backend.modules.files.controller;

import com.entretienbatiment.backend.modules.files.config.UploadPaths;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.net.MalformedURLException;

/**
 * Serves uploaded expense-receipt photos under {@code uploads/expenses/}.
 * Auth is enforced by {@code SecurityConfig}: {@code /api/files/expenses/**}
 * requires an authenticated user.
 */
@RestController
@RequestMapping("/api/files/expenses")
public class ExpenseFilesController {

    private final UploadPaths uploadPaths;

    public ExpenseFilesController(UploadPaths uploadPaths) {
        this.uploadPaths = uploadPaths;
    }

    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> serveFile(@PathVariable String filename) {
        try {
            Path uploadsRoot = uploadPaths.expenses().toAbsolutePath().normalize();
            Path file = uploadsRoot.resolve(filename).normalize();
            // Guard against path traversal
            if (!file.startsWith(uploadsRoot)) {
                return ResponseEntity.badRequest().build();
            }
            Resource resource = new UrlResource(file.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                return ResponseEntity.notFound().build();
            }
            String contentType = Files.probeContentType(file);
            return ResponseEntity.ok()
                    .header("Content-Type", contentType != null ? contentType : "application/octet-stream")
                    .body(resource);
        } catch (MalformedURLException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
