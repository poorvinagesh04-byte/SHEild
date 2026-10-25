package com.sheild.dto;

import com.sheild.domain.ReviewStatus;

import java.time.Instant;

public record EvidenceResponse(
        Long id,
        Long incidentId,
        String originalFilename,
        String mimeType,
        long fileSize,
        Instant uploadedAt,
        String processingStatus,
        String processingLabel,
        String extractedText,
        ReviewStatus reviewStatus,
        String userNote,
        String fileUrl,
        boolean previewable,
        boolean image,
        boolean pdf,
        boolean text
) {
}
