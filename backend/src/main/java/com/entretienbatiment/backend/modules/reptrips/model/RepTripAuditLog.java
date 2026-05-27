package com.entretienbatiment.backend.modules.reptrips.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "rep_trip_audit_log")
public class RepTripAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_id", nullable = false)
    private Long tripId;

    /** Actor user id (NULL = system). */
    @Column(name = "user_id")
    private Long userId;

    /** CREATED | UPDATED | APPROVED | REJECTED | LOCKED | UNLOCKED | DELETED | EXPORTED. */
    @Column(nullable = false, length = 32)
    private String action;

    @Column(length = 255)
    private String summary;

    @Lob
    @Column(name = "before_json", columnDefinition = "MEDIUMTEXT")
    private String beforeJson;

    @Lob
    @Column(name = "after_json", columnDefinition = "MEDIUMTEXT")
    private String afterJson;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public RepTripAuditLog() {}

    public RepTripAuditLog(Long tripId, Long userId, String action, String summary) {
        this.tripId = tripId;
        this.userId = userId;
        this.action = action;
        this.summary = summary;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTripId() { return tripId; }
    public void setTripId(Long tripId) { this.tripId = tripId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getBeforeJson() { return beforeJson; }
    public void setBeforeJson(String beforeJson) { this.beforeJson = beforeJson; }
    public String getAfterJson() { return afterJson; }
    public void setAfterJson(String afterJson) { this.afterJson = afterJson; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
