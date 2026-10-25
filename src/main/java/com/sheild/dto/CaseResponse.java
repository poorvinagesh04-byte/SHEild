package com.sheild.dto;

import java.time.Instant;

public record CaseResponse(
        Long id,
        String reference,
        String title,
        String status,
        String statusLabel,
        Instant createdAt,
        Instant updatedAt,
        long incidentCount,
        long evidenceCount,
        long reviewedIncidentCount,
        long checklistDone,
        long checklistTotal,
        int progressPercent,
        String confirmedSummary,
        Instant summaryConfirmedAt
) {
}
