package com.sheild.service;

import com.sheild.domain.ReviewStatus;
import com.sheild.dto.*;
import com.sheild.entity.*;
import com.sheild.repository.ChecklistItemRepository;
import com.sheild.repository.DocumentedUrlRepository;
import com.sheild.repository.EvidenceRepository;
import com.sheild.repository.IncidentRepository;
import com.sheild.repository.ReportDraftRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class DashboardService {

    private final IncidentRepository incidentRepository;
    private final EvidenceRepository evidenceRepository;
    private final DocumentedUrlRepository urlRepository;
    private final ReportDraftRepository draftRepository;
    private final ChecklistItemRepository checklistRepository;
    private final AccessService accessService;
    private final ConnectionService connectionService;
    private final ResponseMapper mapper;

    public DashboardService(IncidentRepository incidentRepository, EvidenceRepository evidenceRepository,
                            DocumentedUrlRepository urlRepository, ReportDraftRepository draftRepository,
                            ChecklistItemRepository checklistRepository, AccessService accessService,
                            ConnectionService connectionService, ResponseMapper mapper) {
        this.incidentRepository = incidentRepository;
        this.evidenceRepository = evidenceRepository;
        this.urlRepository = urlRepository;
        this.draftRepository = draftRepository;
        this.checklistRepository = checklistRepository;
        this.accessService = accessService;
        this.connectionService = connectionService;
        this.mapper = mapper;
    }

    @Transactional
    public DashboardResponse get(Long caseId, UserEntity user) {
        SafetyCase safetyCase = accessService.requireCase(caseId, user);
        CaseResponse caseInfo = mapper.caseInfo(safetyCase);
        List<Incident> incidentEntities = incidentRepository.findForCase(caseId);
        List<IncidentResponse> incidents = incidentEntities.stream().map(mapper::incident).toList();
        List<EvidenceResponse> evidence = evidenceRepository.findForCase(caseId).stream()
                .map(mapper::evidence).toList();
        List<UrlResponse> urls = urlRepository.findBySafetyCaseIdOrderByCreatedAtDesc(caseId).stream()
                .map(mapper::url).toList();
        List<ConnectionResponse> connections = connectionService.list(caseId, user);
        List<ChecklistItemResponse> checklist = checklistRepository.findBySafetyCaseIdOrderBySortOrderAsc(caseId)
                .stream().map(mapper::checklist).toList();
        List<ReportDraftResponse> drafts = draftRepository.findBySafetyCaseIdOrderByUpdatedAtDesc(caseId)
                .stream().map(mapper::draft).toList();
        List<RecommendationResponse> recommendations = recommendations(caseInfo, incidents, evidence, drafts, checklist);
        ProgressResponse progress = progress(caseInfo, incidents, checklist);
        return new DashboardResponse(caseInfo, incidents, evidence, urls, connections, checklist, drafts,
                recommendations, progress);
    }

    private ProgressResponse progress(CaseResponse caseInfo, List<IncidentResponse> incidents,
                                      List<ChecklistItemResponse> checklist) {
        int percent = caseInfo.progressPercent();
        int checklistPercent = percent;
        String nextStep;
        String route;
        IncidentResponse draft = incidents.stream()
                .filter(i -> i.reviewStatus() == ReviewStatus.DRAFT).findFirst().orElse(null);
        IncidentResponse needsReview = incidents.stream()
                .filter(i -> i.reviewStatus() == ReviewStatus.NEEDS_REVIEW).findFirst().orElse(null);
        ChecklistItemResponse incomplete = checklist.stream().filter(c -> !c.done()).findFirst().orElse(null);
        if (caseInfo.incidentCount() == 0) {
            nextStep = "Document what happened";
            route = "#/report";
        } else if (draft != null) {
            nextStep = "Finish your saved incident draft";
            route = "#/report?incident=" + draft.id();
        } else if (needsReview != null) {
            nextStep = "Review and confirm an incident summary";
            route = "#/evidence/" + needsReview.id();
        } else if (caseInfo.reviewedIncidentCount() > 0
                && !hasConfirmedDraft(caseInfo.id())) {
            nextStep = "Prepare an editable report draft";
            route = "#/action";
        } else if (incomplete != null) {
            nextStep = incomplete.label();
            route = "#/action";
        } else {
            nextStep = "Download or share your case summary";
            route = "#/dashboard";
        }
        return new ProgressResponse(percent, checklistPercent, caseInfo.reviewedIncidentCount(),
                caseInfo.incidentCount(), caseInfo.evidenceCount(), nextStep, route);
    }

    private boolean hasConfirmedDraft(Long caseId) {
        return !draftRepository.findBySafetyCaseIdOrderByUpdatedAtDesc(caseId).isEmpty();
    }

    private List<RecommendationResponse> recommendations(CaseResponse caseInfo, List<IncidentResponse> incidents,
                                                         List<EvidenceResponse> evidence,
                                                         List<ReportDraftResponse> drafts,
                                                         List<ChecklistItemResponse> checklist) {
        List<RecommendationResponse> list = new ArrayList<>();
        boolean anyReviewPending = incidents.stream()
                .anyMatch(i -> i.reviewStatus() != ReviewStatus.REVIEWED);
        boolean hasThreats = incidents.stream().anyMatch(i ->
                i.incidentType() == com.sheild.domain.IncidentType.THREATS
                        || i.incidentType() == com.sheild.domain.IncidentType.DEEPFAKE);
        if (incidents.isEmpty()) {
            list.add(new RecommendationResponse("Start with what you remember",
                    "You do not need every detail. A short description, the platform, and any link you already have are enough to begin.",
                    "Report an incident", "#/report", "Document"));
        } else if (anyReviewPending) {
            list.add(new RecommendationResponse("Review before reporting",
                    "Check the drafted summary against your own words and correct anything that is inaccurate. You decide what becomes a confirmed fact.",
                    "Open evidence review", "#/evidence/" + incidents.get(0).id(), "Review"));
        }
        if (evidence.isEmpty()) {
            list.add(new RecommendationResponse("Preserve what you already have",
                    "Screenshots, profile links, and message copies can help you tell a consistent story later. Keep originals unchanged where you can.",
                    "Add evidence", incidents.isEmpty() ? "#/report" : "#/evidence/" + incidents.get(0).id(), "Preserve"));
        }
        list.add(new RecommendationResponse("Review your account security",
                "Consider a unique password, two-factor authentication, and reviewing who can message or find you. These are protective steps, not fixes for someone else's behaviour.",
                "Open next steps", "#/action", "Safety"));
        if (!incidents.isEmpty() && drafts.isEmpty() && caseInfo.reviewedIncidentCount() > 0) {
            list.add(new RecommendationResponse("Prepare a report draft",
                    "SHEild can arrange your confirmed details into an editable draft. It will not be sent anywhere until you choose to send it yourself.",
                    "Prepare a draft", "#/action", "Report"));
        }
        if (hasThreats) {
            list.add(new RecommendationResponse("Consider a trusted-person safety plan",
                    "If you feel unsafe, think about who you can tell, where you can go, and what information you want to keep with you. The support companion can help you plan the message.",
                    "Open support", "#/support", "Support"));
        }
        list.add(new RecommendationResponse("Use official channels when you are ready",
                "Platform reporting pages and the National Cyber Crime Reporting Portal are listed in Take Action. Reporting is always your choice, and outcomes are not guaranteed.",
                "See reporting resources", "#/action?focus=resources", "Resources"));
        return list.size() > 6 ? list.subList(0, 6) : list;
    }
}
