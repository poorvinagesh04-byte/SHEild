package com.sheild.dto;

import com.sheild.domain.Platform;
import com.sheild.domain.UrlKind;

import java.time.Instant;

public record UrlResponse(
        Long id,
        Long caseId,
        Long incidentId,
        String incidentTypeLabel,
        Platform platform,
        String platformLabel,
        String url,
        UrlKind kind,
        String label,
        String host,
        Instant createdAt
) {
}
