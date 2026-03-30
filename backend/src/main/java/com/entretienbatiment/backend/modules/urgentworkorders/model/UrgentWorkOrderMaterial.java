package com.entretienbatiment.backend.modules.urgentworkorders.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class UrgentWorkOrderMaterial {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "urgent_work_order_id")
    private com.entretienbatiment.backend.modules.urgentworkorders.model.UrgentWorkOrder urgentWorkOrder;

    private String name;
    private Integer quantity;
    private String url;
    private String description;
    private String supplier;
    private Boolean bought = false;
    private LocalDateTime createdAt = LocalDateTime.now();

    public UrgentWorkOrderMaterial() {}
    public UrgentWorkOrderMaterial(com.entretienbatiment.backend.modules.urgentworkorders.model.UrgentWorkOrder urgentWorkOrder, String name, Integer quantity, String url, String description, String supplier) {
        this.urgentWorkOrder = urgentWorkOrder;
        this.name = name;
        this.quantity = quantity;
        this.url = url;
        this.description = description;
        this.supplier = supplier;
        this.bought = false;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public com.entretienbatiment.backend.modules.urgentworkorders.model.UrgentWorkOrder getUrgentWorkOrder() { return urgentWorkOrder; }
    public void setUrgentWorkOrder(com.entretienbatiment.backend.modules.urgentworkorders.model.UrgentWorkOrder urgentWorkOrder) { this.urgentWorkOrder = urgentWorkOrder; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getSupplier() { return supplier; }
    public void setSupplier(String supplier) { this.supplier = supplier; }

    public Boolean getBought() { return bought; }
    public void setBought(Boolean bought) { this.bought = bought; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
