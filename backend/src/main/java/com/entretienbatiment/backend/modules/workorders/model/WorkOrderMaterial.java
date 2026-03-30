package com.entretienbatiment.backend.modules.workorders.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "work_order_material")
public class WorkOrderMaterial {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "work_order_id", nullable = false)
    private WorkOrder workOrder;

    @Column(nullable = false, length = 120)
    private String name;

    @Column
    private Integer quantity;

    @Column(nullable = false)
    private Boolean bought = false;

    @Column(columnDefinition = "TEXT")
    private String url;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 255)
    private String supplier;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    protected WorkOrderMaterial() {}

    public WorkOrderMaterial(WorkOrder workOrder, String name, Integer quantity) {
        this(workOrder, name, quantity, null, null, null);
    }

    public WorkOrderMaterial(WorkOrder workOrder, String name, Integer quantity, String url, String description) {
        this(workOrder, name, quantity, url, description, null);
    }

    public WorkOrderMaterial(WorkOrder workOrder, String name, Integer quantity, String url, String description, String supplier) {
        this.workOrder = workOrder;
        this.name = name;
        this.quantity = quantity;
        this.url = url;
        this.description = description;
        this.supplier = supplier;
        this.bought = false;
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

    // Getters and setters
    public Long getId() { return id; }
    public WorkOrder getWorkOrder() { return workOrder; }
    public String getName() { return name; }
    public Integer getQuantity() { return quantity; }
    public Boolean getBought() { return bought; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setName(String name) { this.name = name; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public void setBought(Boolean bought) { this.bought = bought; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getSupplier() { return supplier; }
    public void setSupplier(String supplier) { this.supplier = supplier; }
}
