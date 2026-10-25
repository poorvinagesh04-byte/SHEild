package com.sheild.dto;

import jakarta.validation.constraints.Size;

public record CreateCaseRequest(
        @Size(max = 160, message = "Case title must be 160 characters or fewer")
        String title
) {
}
