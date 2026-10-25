package com.sheild.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateDraftRequest(
        @Size(max = 200, message = "Title must be 200 characters or fewer")
        String title,
        @NotBlank(message = "Draft content cannot be empty")
        @Size(max = 30000, message = "Draft must be 30,000 characters or fewer")
        String content
) {
}
