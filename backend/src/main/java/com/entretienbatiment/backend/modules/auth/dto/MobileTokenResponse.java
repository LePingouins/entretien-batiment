package com.entretienbatiment.backend.modules.auth.dto;

public record MobileTokenResponse(String accessToken, String refreshToken) {}