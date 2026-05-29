package com.entretienbatiment.backend.modules.files.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Centralized resolver for upload directory paths.
 *
 * <p>Base directory is configured by {@code app.upload.dir} (default: {@code uploads},
 * resolved relative to the JVM working directory — preserves legacy behaviour).
 * In production set this to an absolute path such as
 * {@code /var/lib/entretien-batiment/uploads} via the {@code UPLOAD_DIR} env var.</p>
 */
@Component
public class UploadPaths {

    private final Path base;

    public UploadPaths(@Value("${app.upload.dir:uploads}") String baseDir) {
        this.base = Paths.get(baseDir).toAbsolutePath().normalize();
    }

    /** Absolute, normalized base uploads directory. */
    public Path base() {
        return base;
    }

    /** {@code <base>/workorders} */
    public Path workOrders() {
        return base.resolve("workorders");
    }

    /** {@code <base>/expenses} */
    public Path expenses() {
        return base.resolve("expenses");
    }

    /** {@code <base>/rep-trips} */
    public Path repTrips() {
        return base.resolve("rep-trips");
    }
}
