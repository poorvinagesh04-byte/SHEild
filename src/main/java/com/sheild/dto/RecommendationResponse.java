package com.sheild.dto;

public record RecommendationResponse(
        String title,
        String detail,
        String ctaLabel,
        String ctaRoute,
        String category
) {
}
