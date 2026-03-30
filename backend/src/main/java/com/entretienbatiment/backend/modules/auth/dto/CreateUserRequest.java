package com.entretienbatiment.backend.modules.auth.dto;
import com.entretienbatiment.backend.modules.auth.model.Role;

public record CreateUserRequest(String email, Role role) {}
