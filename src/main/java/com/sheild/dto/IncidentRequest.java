package com.sheild.dto;

import com.sheild.domain.IncidentType;
import com.sheild.domain.Platform;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public record IncidentRequest(
        IncidentType incidentType,
        Platform platform,
        @Size(max = 2048, message = "Profile URL is too long")
        String profileUrl,
        @Size(max = 10, message = "You can add up to 10 additional links")
        List<@Size(max = 2048, message = "Each link must be 2048 characters or fewer") String> additionalUrls,
        @Size(max = 20000, message = "Description must be 20,000 characters or fewer")
        String description,
        Instant occurredAt,
        @Size(max = 5000, message = "Impact notes must be 5,000 characters or fewer")
        String impactNotes,
        boolean draft
) {
}
