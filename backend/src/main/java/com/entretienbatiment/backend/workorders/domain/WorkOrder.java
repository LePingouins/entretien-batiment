package com.entretienbatiment.backend.workorders.domain;

import com.entretienbatiment.backend.auth.AppUser;
import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;

@Entity
@Table(name = "work_orders")
public class WorkOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToMany(mappedBy = "workOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WorkOrderMaterial> materials;

    @Column(nullable = false, length = 140)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 200)
    private String location;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "work_order_priority")
    private WorkOrderPriority priority = WorkOrderPriority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "work_order_status")
    private WorkOrderStatus status = WorkOrderStatus.OPEN;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private AppUser createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to_user_id")
    private AppUser assignedTo;

    private LocalDate requestedDate;
    private LocalDate dueDate;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

        // Attachment fields
    @Column(name = "attachment_filename")
    private String attachmentFilename;

    @Column(name = "attachment_content_type")
    private String attachmentContentType;

    /**
     * Manual ordering index within the status column.
     * NULL means the item should be ordered by priority.
     * When user manually reorders via drag-and-drop, this gets a value (0..N-1).
     */
    @Column(name = "sort_index")
    private Integer sortIndex;
    public String getAttachmentFilename() { return attachmentFilename; }
    public String getAttachmentContentType() { return attachmentContentType; }
    public void setAttachmentFilename(String attachmentFilename) { this.attachmentFilename = attachmentFilename; }
    public void setAttachmentContentType(String attachmentContentType) { this.attachmentContentType = attachmentContentType; }

    public Integer getSortIndex() { return sortIndex; }
    public void setSortIndex(Integer sortIndex) { this.sortIndex = sortIndex; }

    protected WorkOrder() {}

    public WorkOrder(
            String title,
            String description,
            String location,
            WorkOrderPriority priority,
            AppUser createdBy,
            LocalDate requestedDate,
            LocalDate dueDate
    ) {
        this.title = title;
        this.description = description;
        this.location = location;
        this.priority = priority == null ? WorkOrderPriority.MEDIUM : priority;
        this.status = WorkOrderStatus.OPEN;
        this.createdBy = createdBy;
        this.requestedDate = requestedDate;
        this.dueDate = dueDate;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        this.updatedAt = Instant.now();
    }

    // --- domain actions ---
    public void assignTo(AppUser tech) {
        this.assignedTo = tech;
        if (this.status == WorkOrderStatus.OPEN) {
            this.status = WorkOrderStatus.ASSIGNED;
        }
    }

    public void changeStatus(WorkOrderStatus newStatus) {
        this.status = newStatus;
    }

    // Getters
    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getLocation() { return location; }
    public WorkOrderPriority getPriority() { return priority; }
    public WorkOrderStatus getStatus() { return status; }
    public AppUser getCreatedBy() { return createdBy; }
    public AppUser getAssignedTo() { return assignedTo; }
    public LocalDate getRequestedDate() { return requestedDate; }
    public LocalDate getDueDate() { return dueDate; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

     // Setters for update
    public void setTitle(String title) { this.title = title; }
    public void setDescription(String description) { this.description = description; }
    public void setLocation(String location) { this.location = location; }
    public void setPriority(WorkOrderPriority priority) { this.priority = priority; }
    public void setStatus(WorkOrderStatus status) { this.status = status; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public List<WorkOrderMaterial> getMaterials() { return materials; }
    public void setMaterials(List<WorkOrderMaterial> materials) { this.materials = materials; }
}
