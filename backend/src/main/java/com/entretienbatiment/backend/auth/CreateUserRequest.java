package com.entretienbatiment.backend.auth;

public record CreateUserRequest(String email, String password, Role role) {}
