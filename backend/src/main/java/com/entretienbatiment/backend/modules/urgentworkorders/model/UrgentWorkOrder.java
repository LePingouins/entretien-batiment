package com.entretienbatiment.backend.modules.urgentworkorders.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity

public class UrgentWorkOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "work_order_shared_id_seq")
    @SequenceGenerator(name = "work_order_shared_id_seq", sequenceName = "work_order_shared_id_seq", allocationSize = 1)
    private Long id;

    private String title;
    private String description;
    private String location;
    private String priority; // LOW, MEDIUM, HIGH, URGENT
    private String status; // IN_PROGRESS, COMPLETED

    private Long createdByUserId;
    private Long assignedToUserId;

    @Transient
    private String createdByName;

    @Transient
    private String assignedToName;

    private LocalDateTime requestedDate;
    private LocalDateTime dueDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime completedAt;

    @PrePersist
    private void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = createdAt;
    }

    @PreUpdate
    private void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    private String attachmentFilename;
    private String attachmentContentType;
    private String attachmentDownloadUrl;

    private String invoiceFilename;
    private String invoiceContentType;

    private Integer materialsCount;
    private String materialsPreview; // Could be JSON or comma-separated

    @Column(columnDefinition = "boolean default false")
    private Boolean archived = false;
    private LocalDateTime archivedAt;

    private Integer sortIndex;


    // Constructors
    public UrgentWorkOrder() {}

    public UrgentWorkOrder(String title, String description, String location, String status) {
        this.title = title;
        this.description = description;
        this.location = location;
        this.status = status;
        this.createdAt = LocalDateTime.now();
    }

    // Getters and setters for all fields
    public Long getId() { return id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Long getCreatedByUserId() { return createdByUserId; }
    public void setCreatedByUserId(Long createdByUserId) { this.createdByUserId = createdByUserId; }
    public String getCreatedByName() { return createdByName; }
    public void setCreatedByName(String createdByName) { this.createdByName = createdByName; }
    public Long getAssignedToUserId() { return assignedToUserId; }
    public void setAssignedToUserId(Long assignedToUserId) { this.assignedToUserId = assignedToUserId; }
    public String getAssignedToName() { return assignedToName; }
    public void setAssignedToName(String assignedToName) { this.assignedToName = assignedToName; }
    public LocalDateTime getRequestedDate() { return requestedDate; }
    public void setRequestedDate(LocalDateTime requestedDate) { this.requestedDate = requestedDate; }
    public LocalDateTime getDueDate() { return dueDate; }
    public void setDueDate(LocalDateTime dueDate) { this.dueDate = dueDate; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
    public String getAttachmentFilename() { return attachmentFilename; }
    public void setAttachmentFilename(String attachmentFilename) { this.attachmentFilename = attachmentFilename; }
    public String getAttachmentContentType() { return attachmentContentType; }
    public void setAttachmentContentType(String attachmentContentType) { this.attachmentContentType = attachmentContentType; }
    public String getAttachmentDownloadUrl() { 
        if (attachmentDownloadUrl == null && attachmentFilename != null) {
            return "/api/files/workorders/" + attachmentFilename;
        }
        return attachmentDownloadUrl; 
    }
    public void setAttachmentDownloadUrl(String attachmentDownloadUrl) { this.attachmentDownloadUrl = attachmentDownloadUrl; }
    public String getInvoiceFilename() { return invoiceFilename; }
    public void setInvoiceFilename(String invoiceFilename) { this.invoiceFilename = invoiceFilename; }
    public String getInvoiceContentType() { return invoiceContentType; }
    public void setInvoiceContentType(String invoiceContentType) { this.invoiceContentType = invoiceContentType; }
    public String getInvoiceDownloadUrl() {
        if (invoiceFilename != null && !invoiceFilename.isBlank()) {
            return "/api/files/workorders/" + invoiceFilename;
        }
        return null;
    }
    public Integer getMaterialsCount() { return materialsCount; }
    public void setMaterialsCount(Integer materialsCount) { this.materialsCount = materialsCount; }
    public String getMaterialsPreview() { return materialsPreview; }
    public void setMaterialsPreview(String materialsPreview) { this.materialsPreview = materialsPreview; }
    public Boolean getArchived() { return archived; }
    public void setArchived(Boolean archived) { this.archived = archived; }
    public LocalDateTime getArchivedAt() { return archivedAt; }
    public void setArchivedAt(LocalDateTime archivedAt) { this.archivedAt = archivedAt; }
    public Integer getSortIndex() { return sortIndex; }
    public void setSortIndex(Integer sortIndex) { this.sortIndex = sortIndex; }
}
