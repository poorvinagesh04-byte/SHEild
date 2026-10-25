package com.sheild.dto;

import java.time.Instant;
import java.util.List;

public record ReviewResponse(
        Long incidentId,
        String draftSummary,
        List<String> missingDetails,
        List<String> provenanceNotes,
        Instant generatedAt,
        String reviewStatus,
        long evidenceCount,
        String mode
) {
}
