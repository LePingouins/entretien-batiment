package com.entretienbatiment.backend.modules.auth.model;

public enum Role {
    ADMIN,
    DEVELOPPER,
    TECH,
    WORKER;

    public boolean isAdminLike() {
        return this == ADMIN || this == DEVELOPPER;
    }
}
