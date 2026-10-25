package com.sheild.dto;

import java.time.Instant;

public record ChecklistItemResponse(
        Long id,
        Long caseId,
        String code,
        String label,
        String description,
        boolean done,
        Instant completedAt,
        int sortOrder
) {
}
