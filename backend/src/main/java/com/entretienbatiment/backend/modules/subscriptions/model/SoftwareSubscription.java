package com.entretienbatiment.backend.modules.subscriptions.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "software_subscription")
public class SoftwareSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 120)
    private String vendor;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "subscription_category")
    private SubscriptionCategory category = SubscriptionCategory.OTHER;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal cost = BigDecimal.ZERO;

    @Column(nullable = false, length = 3)
    private String currency = "CAD";

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "billing_cycle", nullable = false, columnDefinition = "subscription_billing_cycle")
    private SubscriptionBillingCycle billingCycle = SubscriptionBillingCycle.MONTHLY;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "subscription_status")
    private SubscriptionStatus status = SubscriptionStatus.ACTIVE;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "next_due_date")
    private LocalDate nextDueDate;

    @Column(name = "auto_renew", nullable = false)
    private boolean autoRenew = true;

    @Column(name = "website_url", length = 500)
    private String websiteUrl;

    @Column(name = "contact_email", length = 255)
    private String contactEmail;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

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

    public SoftwareSubscription() {}

    // ─── Getters & Setters ──────────────────────────────────────────────

    public Long getId() { return id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getVendor() { return vendor; }
    public void setVendor(String vendor) { this.vendor = vendor; }

    public SubscriptionCategory getCategory() { return category; }
    public void setCategory(SubscriptionCategory category) { this.category = category; }

    public BigDecimal getCost() { return cost; }
    public void setCost(BigDecimal cost) { this.cost = cost; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public SubscriptionBillingCycle getBillingCycle() { return billingCycle; }
    public void setBillingCycle(SubscriptionBillingCycle billingCycle) { this.billingCycle = billingCycle; }

    public SubscriptionStatus getStatus() { return status; }
    public void setStatus(SubscriptionStatus status) { this.status = status; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getNextDueDate() { return nextDueDate; }
    public void setNextDueDate(LocalDate nextDueDate) { this.nextDueDate = nextDueDate; }

    public boolean isAutoRenew() { return autoRenew; }
    public void setAutoRenew(boolean autoRenew) { this.autoRenew = autoRenew; }

    public String getWebsiteUrl() { return websiteUrl; }
    public void setWebsiteUrl(String websiteUrl) { this.websiteUrl = websiteUrl; }

    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    /**
     * Returns the monthly equivalent cost regardless of billing cycle.
     */
    public BigDecimal getMonthlyCost() {
        if (cost == null) return BigDecimal.ZERO;
        return switch (billingCycle) {
            case MONTHLY -> cost;
            case QUARTERLY -> cost.divide(BigDecimal.valueOf(3), 2, java.math.RoundingMode.HALF_UP);
            case SEMI_ANNUAL -> cost.divide(BigDecimal.valueOf(6), 2, java.math.RoundingMode.HALF_UP);
            case YEARLY -> cost.divide(BigDecimal.valueOf(12), 2, java.math.RoundingMode.HALF_UP);
        };
    }

    /**
     * Returns the yearly equivalent cost regardless of billing cycle.
     */
    public BigDecimal getYearlyCost() {
        if (cost == null) return BigDecimal.ZERO;
        return switch (billingCycle) {
            case MONTHLY -> cost.multiply(BigDecimal.valueOf(12));
            case QUARTERLY -> cost.multiply(BigDecimal.valueOf(4));
            case SEMI_ANNUAL -> cost.multiply(BigDecimal.valueOf(2));
            case YEARLY -> cost;
        };
    }
}
