package com.sheild.dto;

import jakarta.validation.constraints.Size;

public record CreateSessionRequest(
        @Size(max = 80, message = "Display name must be 80 characters or fewer")
        String displayName
) {
}
