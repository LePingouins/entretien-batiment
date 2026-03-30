package com.entretienbatiment.backend.modules.auth.dto;

public record LoginRequest(String email, String password, Boolean rememberMe) {
	public boolean rememberMeEnabled() {
		return Boolean.TRUE.equals(rememberMe);
	}
}
