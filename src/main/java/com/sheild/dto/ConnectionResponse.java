package com.sheild.dto;

import com.sheild.domain.ConnectionBasis;
import com.sheild.domain.ConnectionStatus;

import java.time.Instant;

public record ConnectionResponse(
        Long id,
        Long incidentAId,
        Long incidentBId,
        String incidentAType,
        String incidentBType,
        String reason,
        ConnectionBasis basis,
        String basisLabel,
        ConnectionStatus status,
        Instant createdAt,
        Instant decidedAt
) {
}
