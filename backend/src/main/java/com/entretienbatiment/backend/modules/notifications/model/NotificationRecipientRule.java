package com.entretienbatiment.backend.modules.notifications.model;

import com.entretienbatiment.backend.modules.auth.model.Role;
import jakarta.persistence.*;

@Entity
@Table(
        name = "notification_recipient_rule",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_notification_recipient_rule", columnNames = {"source", "role"})
        }
)
public class NotificationRecipientRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String source;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(nullable = false)
    private boolean enabled;

    public Long getId() {
        return id;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }
}