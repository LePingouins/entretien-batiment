package com.entretienbatiment.backend.modules.permissions.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
        name = "user_page_access_override",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_user_page_access_override", columnNames = {"user_id", "page_key"})
        }
)
public class UserPageAccessOverride {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "page_key", nullable = false)
    private String pageKey;

    @Column(nullable = false)
    private boolean allowed;

    /** Optional: if set, the override is only active at/after this instant. */
    @Column(name = "valid_from")
    private Instant validFrom;

    /** Optional: if set, the override expires at this instant. */
    @Column(name = "valid_until")
    private Instant validUntil;

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getPageKey() {
        return pageKey;
    }

    public void setPageKey(String pageKey) {
        this.pageKey = pageKey;
    }

    public boolean isAllowed() {
        return allowed;
    }

    public void setAllowed(boolean allowed) {
        this.allowed = allowed;
    }

    public Instant getValidFrom() {
        return validFrom;
    }

    public void setValidFrom(Instant validFrom) {
        this.validFrom = validFrom;
    }

    public Instant getValidUntil() {
        return validUntil;
    }

    public void setValidUntil(Instant validUntil) {
        this.validUntil = validUntil;
    }

    /** True when the override is currently within its active time window (or has no window). */
    public boolean isActiveNow() {
        Instant now = Instant.now();
        if (validFrom != null && now.isBefore(validFrom)) return false;
        if (validUntil != null && now.isAfter(validUntil)) return false;
        return true;
    }
}
