package com.entretienbatiment.backend.modules.auth.dto;
import com.entretienbatiment.backend.modules.auth.model.Role;

public record UserResponse(Long id, String email, Role role, boolean enabled, boolean remindersEnabled, boolean getReminders) {}
