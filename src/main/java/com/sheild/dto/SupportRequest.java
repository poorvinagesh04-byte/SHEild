package com.sheild.dto;

import com.sheild.domain.SupportAction;
import com.sheild.domain.SupportFeeling;
import jakarta.validation.constraints.NotNull;

public record SupportRequest(
        @NotNull(message = "Choose how you are feeling, or choose 'I just need someone to listen'")
        SupportFeeling feeling,
        SupportAction action,
        Long caseId,
        boolean associateWithCase
) {
}
