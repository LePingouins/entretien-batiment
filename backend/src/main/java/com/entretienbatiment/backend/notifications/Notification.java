package com.entretienbatiment.backend.notifications;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notification")
public class Notification {

    @Id
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "target_user_id")
    private Long targetUserId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(nullable = false)
    private Instant date;

    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;

    @Column
    private String href;

    @Column
    private String source;

    @Column(name = "bug_report_id")
    private Long bugReportId;

    @PrePersist
    public void ensureId() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        if (date == null) {
            date = Instant.now();
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Long getTargetUserId() { return targetUserId; }
    public void setTargetUserId(Long targetUserId) { this.targetUserId = targetUserId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Instant getDate() { return date; }
    public void setDate(Instant date) { this.date = date; }
    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { isRead = read; }
    public String getHref() { return href; }
    public void setHref(String href) { this.href = href; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public Long getBugReportId() { return bugReportId; }
    public void setBugReportId(Long bugReportId) { this.bugReportId = bugReportId; }
}
