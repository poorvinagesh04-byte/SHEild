package com.sheild.dto;

import java.util.List;

public record SupportResponse(
        String message,
        String mode,
        String modeLabel,
        String exerciseTitle,
        List<String> exerciseSteps,
        List<SupportOption> options,
        List<SupportResource> resources,
        boolean metadataStored,
        String metadataNote
) {
    public record SupportOption(String id, String label, String action) {
    }

    public record SupportResource(String label, String description, String url, String phone) {
    }
}
