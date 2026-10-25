package com.sheild.dto;

public record ProgressResponse(
        int percent,
        int checklistPercent,
        long reviewedIncidents,
        long totalIncidents,
        long evidenceCount,
        String nextStep,
        String nextStepRoute
) {
}
