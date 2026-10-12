package com.bardomarcelo.menu.auth;

public record TokenResponse(String accessToken, String tokenType, long expiresIn) {
}
