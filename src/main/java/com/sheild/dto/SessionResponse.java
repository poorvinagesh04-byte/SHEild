package com.sheild.dto;

import jakarta.validation.constraints.Size;

import java.time.Instant;

public record SessionResponse(
        String token,
        Long userId,
        String displayName,
        Instant createdAt
) {
}
