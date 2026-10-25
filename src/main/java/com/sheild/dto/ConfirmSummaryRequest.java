package com.sheild.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ConfirmSummaryRequest(
        @NotBlank(message = "Please confirm or write a summary before saving")
        @Size(max = 20000, message = "Summary must be 20,000 characters or fewer")
        String summary
) {
}
