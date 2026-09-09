package com.entretienbatiment.backend.modules.auth.model;

public enum Role {
    ADMIN,
    DEVELOPPER,
    MANAGER,
    TECH,
    WORKER,
    REPRESENTANT;

    public boolean isAdminLike() {
        return this == ADMIN || this == DEVELOPPER || this == MANAGER;
    }
}
