package com.entretienbatiment.backend.auth;

public record LoginRequest(String email, String password, Boolean rememberMe) {
	public boolean rememberMeEnabled() {
		return Boolean.TRUE.equals(rememberMe);
	}
}
