package com.entretienbatiment.backend.modules.inventory.model;

import com.entretienbatiment.backend.modules.auth.model.AppUser;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "inventory_count_items",
       uniqueConstraints = @UniqueConstraint(columnNames = {"session_id", "product_id"}))
public class InventoryCountItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private InventoryCountSession session;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private InventoryProduct product;

    @Column(precision = 12, scale = 2)
    private BigDecimal countedQty;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal expectedQty = BigDecimal.ZERO;

    @Column(length = 80)
    private String zone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "counted_by")
    private AppUser countedBy;

    @Column(columnDefinition = "TEXT")
    private String notes;

    private Instant countedAt;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public InventoryCountItem() {}

    public void recordCount(BigDecimal qty, AppUser user) {
        this.countedQty = qty;
        this.countedBy = user;
        this.countedAt = Instant.now();
    }

    public BigDecimal getDiscrepancy() {
        if (countedQty == null) return null;
        return countedQty.subtract(expectedQty);
    }

    public Long getId() { return id; }
    public InventoryCountSession getSession() { return session; }
    public void setSession(InventoryCountSession session) { this.session = session; }
    public InventoryProduct getProduct() { return product; }
    public void setProduct(InventoryProduct product) { this.product = product; }
    public BigDecimal getCountedQty() { return countedQty; }
    public void setCountedQty(BigDecimal countedQty) { this.countedQty = countedQty; }
    public BigDecimal getExpectedQty() { return expectedQty; }
    public void setExpectedQty(BigDecimal expectedQty) { this.expectedQty = expectedQty; }
    public String getZone() { return zone; }
    public void setZone(String zone) { this.zone = zone; }
    public AppUser getCountedBy() { return countedBy; }
    public void setCountedBy(AppUser countedBy) { this.countedBy = countedBy; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Instant getCountedAt() { return countedAt; }
    public Instant getCreatedAt() { return createdAt; }
}
