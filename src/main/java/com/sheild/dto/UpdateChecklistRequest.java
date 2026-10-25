package com.sheild.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateChecklistRequest(
        @NotNull(message = "Completion status is required")
        Boolean done
) {
}
