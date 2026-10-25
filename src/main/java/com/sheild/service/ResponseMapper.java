package com.sheild.service;

import com.sheild.domain.ReviewStatus;
import com.sheild.dto.*;
import com.sheild.entity.*;
import com.sheild.repository.ChecklistItemRepository;
import com.sheild.repository.DocumentedUrlRepository;
import com.sheild.repository.EvidenceRepository;
import com.sheild.repository.IncidentRepository;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.List;

@Component
public class ResponseMapper {

    private final EvidenceRepository evidenceRepository;
    private final DocumentedUrlRepository urlRepository;
    private final ChecklistItemRepository checklistRepository;
    private final IncidentRepository incidentRepository;

    public ResponseMapper(EvidenceRepository evidenceRepository, DocumentedUrlRepository urlRepository,
                          ChecklistItemRepository checklistRepository, IncidentRepository incidentRepository) {
        this.evidenceRepository = evidenceRepository;
        this.urlRepository = urlRepository;
        this.checklistRepository = checklistRepository;
        this.incidentRepository = incidentRepository;
    }

    public CaseResponse caseInfo(SafetyCase c) {
        long incidents = incidentRepository.countBySafetyCaseId(c.getId());
        long evidence = evidenceRepository.countForCase(c.getId());
        long reviewed = incidentRepository.countBySafetyCaseIdAndReviewStatus(c.getId(), ReviewStatus.REVIEWED);
        long checklistTotal = checklistRepository.countBySafetyCaseId(c.getId());
        long checklistDone = checklistRepository.countBySafetyCaseIdAndDoneTrue(c.getId());
        int percent = checklistTotal == 0 ? 0 : (int) Math.round(checklistDone * 100.0 / checklistTotal);
        return new CaseResponse(c.getId(), c.getReference(), c.getTitle(), c.getStatus().name(),
                c.getStatus().getLabel(), c.getCreatedAt(), c.getUpdatedAt(), incidents, evidence,
                reviewed, checklistDone, checklistTotal, percent, c.getConfirmedSummary(),
                c.getSummaryConfirmedAt());
    }

    public EvidenceResponse evidence(Evidence e) {
        boolean image = EvidenceStorageService.isImage(e.getMimeType());
        boolean pdf = "application/pdf".equals(e.getMimeType());
        boolean text = "text/plain".equals(e.getMimeType());
        return new EvidenceResponse(e.getId(), e.getIncident().getId(), e.getOriginalFilename(), e.getMimeType(),
                e.getFileSize(), e.getUploadedAt(), e.getProcessingStatus().name(),
                e.getProcessingStatus().getLabel(), e.getExtractedText(), e.getReviewStatus(), e.getUserNote(),
                "/api/evidence/" + e.getId() + "/file", image || pdf || text, image, pdf, text);
    }

    public UrlResponse url(DocumentedUrl u) {
        String label = u.getUrlKind() == com.sheild.domain.UrlKind.PROFILE
                ? "Profile or account" : "Additional link";
        if (u.getDisplayLabel() != null && !u.getDisplayLabel().isBlank()) {
            label = u.getDisplayLabel();
        }
        Long incidentId = u.getIncident() == null ? null : u.getIncident().getId();
        String incidentType = u.getIncident() == null ? null : u.getIncident().getIncidentType().getLabel();
        return new UrlResponse(u.getId(), u.getSafetyCase().getId(), incidentId, incidentType, u.getPlatform(),
                u.getPlatform().getLabel(), u.getUrl(), u.getUrlKind(), label, hostOf(u.getUrl()), u.getCreatedAt());
    }

    public IncidentResponse incident(Incident i) {
        List<UrlResponse> urls = urlRepository.findByIncidentIdOrderByCreatedAtAsc(i.getId()).stream()
                .map(this::url).toList();
        List<EvidenceResponse> evidence = evidenceRepository.findByIncidentIdOrderByUploadedAtDesc(i.getId()).stream()
                .map(this::evidence).toList();
        return new IncidentResponse(i.getId(), i.getSafetyCase().getId(), i.getIncidentType(),
                i.getIncidentType().getLabel(), i.getPlatform(), i.getPlatform().getLabel(), i.getDescription(),
                i.getOccurredAt(), i.getImpactNotes(), i.getReviewStatus(), i.getSuggestedSummary(),
                i.getSummaryGeneratedAt(), i.getConfirmedSummary(), i.getSummaryConfirmedAt(),
                i.getCreatedAt(), i.getUpdatedAt(), urls, evidence, evidence.size());
    }

    public ReportDraftResponse draft(ReportDraft d) {
        return new ReportDraftResponse(d.getId(), d.getSafetyCase().getId(), d.getIncident().getId(),
                d.getIncident().getIncidentType().getLabel(), d.getTitle(), d.getContent(), d.getStatus(),
                d.getCreatedAt(), d.getUpdatedAt());
    }

    public ChecklistItemResponse checklist(ChecklistItem c) {
        return new ChecklistItemResponse(c.getId(), c.getSafetyCase().getId(), c.getCode(), c.getLabel(),
                c.getDescription(), c.isDone(), c.getCompletedAt(), c.getSortOrder());
    }

    public ConnectionResponse connection(IncidentConnection c) {
        String basisLabel = switch (c.getBasis()) {
            case SHARED_LINK -> "Same documented link";
            case SHARED_HANDLE -> "Same account identifier";
            case SIMILAR_CONTEXT -> "Similar context";
        };
        return new ConnectionResponse(c.getId(), c.getIncidentA().getId(), c.getIncidentB().getId(),
                c.getIncidentA().getIncidentType().getLabel(), c.getIncidentB().getIncidentType().getLabel(),
                c.getReason(), c.getBasis(), basisLabel, c.getStatus(), c.getCreatedAt(), c.getDecidedAt());
    }

    public static String hostOf(String url) {
        try {
            URI uri = URI.create(url);
            return uri.getHost() == null ? "link" : uri.getHost();
        } catch (Exception ex) {
            return "link";
        }
    }
}
