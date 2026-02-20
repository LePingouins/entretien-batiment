package com.entretienbatiment.backend.mileage;

import jakarta.persistence.*;
import com.entretienbatiment.backend.workorders.domain.WorkOrder;
import com.entretienbatiment.backend.urgentworkorders.UrgentWorkOrder;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDate;

@Entity
public class MileageEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate date;
    private String supplier;
    private Integer startKm;
    private Integer endKm;
    // Optional link to WorkOrder
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_order_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private WorkOrder workOrder;

    // Optional link to UrgentWorkOrder
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "urgent_work_order_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private UrgentWorkOrder urgentWorkOrder;
    
    @Transient
    private Long workOrderIdTransient;

    @Transient
    private Long urgentWorkOrderIdTransient;
    
    @Column(columnDefinition = "boolean default false")
    private Boolean archived = false;

    private java.time.LocalDateTime archivedAt;

    public MileageEntry() {}

    public MileageEntry(LocalDate date, String supplier, Integer startKm, Integer endKm) {
        this.date = date;
        this.supplier = supplier;
        this.startKm = startKm;
        this.endKm = endKm;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public String getSupplier() { return supplier; }
    public void setSupplier(String supplier) { this.supplier = supplier; }
    public Integer getStartKm() { return startKm; }
    public void setStartKm(Integer startKm) { this.startKm = startKm; }
    public Integer getEndKm() { return endKm; }
    public void setEndKm(Integer endKm) { this.endKm = endKm; }
    public Boolean getArchived() { return archived; }
    public void setArchived(Boolean archived) { this.archived = archived; }
    public java.time.LocalDateTime getArchivedAt() { return archivedAt; }
    public void setArchivedAt(java.time.LocalDateTime archivedAt) { this.archivedAt = archivedAt; }
    public Integer getTotalKm() {
        if (startKm == null || endKm == null) return null;
        int total = endKm - startKm;
        return total < 0 ? 0 : total;
    }
    public WorkOrder getWorkOrder() { return workOrder; }
    public void setWorkOrder(WorkOrder workOrder) { this.workOrder = workOrder; }
    public UrgentWorkOrder getUrgentWorkOrder() { return urgentWorkOrder; }
    public void setUrgentWorkOrder(UrgentWorkOrder urgentWorkOrder) { this.urgentWorkOrder = urgentWorkOrder; }

    @com.fasterxml.jackson.annotation.JsonProperty("workOrderId")
    public Long getWorkOrderId() {
        if (workOrderIdTransient != null) return workOrderIdTransient;
        return workOrder != null ? workOrder.getId() : null;
    }

    public void setWorkOrderId(Long workOrderId) {
        this.workOrderIdTransient = workOrderId;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("urgentWorkOrderId")
    public Long getUrgentWorkOrderId() {
        if (urgentWorkOrderIdTransient != null) return urgentWorkOrderIdTransient;
        return urgentWorkOrder != null ? urgentWorkOrder.getId() : null;
    }

    public void setUrgentWorkOrderId(Long urgentWorkOrderId) {
        this.urgentWorkOrderIdTransient = urgentWorkOrderId;
    }
}
