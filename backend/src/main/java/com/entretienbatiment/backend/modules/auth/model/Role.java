package com.entretienbatiment.backend.modules.auth.model;

public enum Role {
    ADMIN,
    DEVELOPPER,
    TECH,
    WORKER,
    REPRESENTANT;

    public boolean isAdminLike() {
        return this == ADMIN || this == DEVELOPPER;
    }
}
