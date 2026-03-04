package com.entretienbatiment.backend.bugreport;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "bug_report_feature")
public class BugReportFeature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reporter_user_id", nullable = false)
    private Long reporterUserId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "confirmed_by_user_id")
    private Long confirmedByUserId;

    @Column(name = "reporter_deleted_at")
    private Instant reporterDeletedAt;

    @Column(name = "admin_deleted_at")
    private Instant adminDeletedAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public Long getId() {
        return id;
    }

    public Long getReporterUserId() {
        return reporterUserId;
    }

    public void setReporterUserId(Long reporterUserId) {
        this.reporterUserId = reporterUserId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getConfirmedAt() {
        return confirmedAt;
    }

    public void setConfirmedAt(Instant confirmedAt) {
        this.confirmedAt = confirmedAt;
    }

    public Long getConfirmedByUserId() {
        return confirmedByUserId;
    }

    public void setConfirmedByUserId(Long confirmedByUserId) {
        this.confirmedByUserId = confirmedByUserId;
    }

    public Instant getReporterDeletedAt() {
        return reporterDeletedAt;
    }

    public void setReporterDeletedAt(Instant reporterDeletedAt) {
        this.reporterDeletedAt = reporterDeletedAt;
    }

    public Instant getAdminDeletedAt() {
        return adminDeletedAt;
    }

    public void setAdminDeletedAt(Instant adminDeletedAt) {
        this.adminDeletedAt = adminDeletedAt;
    }
}
