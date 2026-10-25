package com.sheild.dto;

import com.sheild.domain.DraftStatus;

import java.time.Instant;

public record ReportDraftResponse(
        Long id,
        Long caseId,
        Long incidentId,
        String incidentTypeLabel,
        String title,
        String content,
        DraftStatus status,
        Instant createdAt,
        Instant updatedAt
) {
}
