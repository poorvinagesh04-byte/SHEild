package com.sheild.dto;

import java.util.List;

public record DashboardResponse(
        CaseResponse caseInfo,
        List<IncidentResponse> incidents,
        List<EvidenceResponse> evidence,
        List<UrlResponse> urls,
        List<ConnectionResponse> connections,
        List<ChecklistItemResponse> checklist,
        List<ReportDraftResponse> drafts,
        List<RecommendationResponse> recommendations,
        ProgressResponse progress
) {
}
