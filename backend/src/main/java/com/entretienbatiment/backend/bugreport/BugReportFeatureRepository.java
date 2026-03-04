package com.entretienbatiment.backend.bugreport;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BugReportFeatureRepository extends JpaRepository<BugReportFeature, Long> {
    Optional<BugReportFeature> findTopByReporterUserIdOrderByCreatedAtDesc(Long reporterUserId);
}
