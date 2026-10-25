package com.sheild.dto;

import com.sheild.domain.ConnectionStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateConnectionRequest(
        @NotNull(message = "Choose whether to confirm or dismiss this suggestion")
        ConnectionStatus status
) {
}
