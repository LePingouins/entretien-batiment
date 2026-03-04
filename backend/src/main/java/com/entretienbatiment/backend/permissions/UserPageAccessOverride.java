package com.entretienbatiment.backend.permissions;

import jakarta.persistence.*;

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
}
