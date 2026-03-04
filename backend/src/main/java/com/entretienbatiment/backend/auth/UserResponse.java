package com.entretienbatiment.backend.auth;

public record UserResponse(Long id, String email, Role role, boolean enabled, boolean remindersEnabled, boolean getReminders) {}
