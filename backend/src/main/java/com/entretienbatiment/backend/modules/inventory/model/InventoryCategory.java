package com.entretienbatiment.backend.modules.inventory.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "inventory_categories")
public class InventoryCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 120)
    private String name;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public InventoryCategory() {}

    public InventoryCategory(String name) {
        this.name = name;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Instant getCreatedAt() { return createdAt; }
}
