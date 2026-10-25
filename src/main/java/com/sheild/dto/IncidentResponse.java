package com.sheild.dto;

import com.sheild.domain.IncidentType;
import com.sheild.domain.Platform;
import com.sheild.domain.ReviewStatus;

import java.time.Instant;
import java.util.List;

public record IncidentResponse(
        Long id,
        Long caseId,
        IncidentType incidentType,
        String incidentTypeLabel,
        Platform platform,
        String platformLabel,
        String description,
        Instant occurredAt,
        String impactNotes,
        ReviewStatus reviewStatus,
        String suggestedSummary,
        Instant summaryGeneratedAt,
        String confirmedSummary,
        Instant summaryConfirmedAt,
        Instant createdAt,
        Instant updatedAt,
        List<UrlResponse> urls,
        List<EvidenceResponse> evidence,
        long evidenceCount
) {
}
