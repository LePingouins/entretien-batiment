package com.entretienbatiment.backend.auth;

public enum Role {
    ADMIN,
    DEVELOPPER,
    TECH,
    WORKER;

    public boolean isAdminLike() {
        return this == ADMIN || this == DEVELOPPER;
    }
}
