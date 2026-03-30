package com.entretienbatiment.backend.modules.permissions.model;

import com.entretienbatiment.backend.modules.auth.model.Role;
import jakarta.persistence.*;

@Entity
@Table(
        name = "role_page_access",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_role_page_access", columnNames = {"page_key", "role"})
        }
)
public class RolePageAccess {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "page_key", nullable = false)
    private String pageKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(nullable = false)
    private boolean allowed;

    public Long getId() {
        return id;
    }

    public String getPageKey() {
        return pageKey;
    }

    public void setPageKey(String pageKey) {
        this.pageKey = pageKey;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public boolean isAllowed() {
        return allowed;
    }

    public void setAllowed(boolean allowed) {
        this.allowed = allowed;
    }
}
