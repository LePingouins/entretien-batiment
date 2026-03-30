package com.entretienbatiment.backend.modules.bugreport.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import com.entretienbatiment.backend.modules.bugreport.model.BugReportFeature;

public interface BugReportFeatureRepository extends JpaRepository<BugReportFeature, Long> {
    Optional<BugReportFeature> findTopByReporterUserIdOrderByCreatedAtDesc(Long reporterUserId);
}
