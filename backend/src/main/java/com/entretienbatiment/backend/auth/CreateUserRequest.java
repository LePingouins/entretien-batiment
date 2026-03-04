package com.entretienbatiment.backend.auth;

public record CreateUserRequest(String email, Role role) {}
