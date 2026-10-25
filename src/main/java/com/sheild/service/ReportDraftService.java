package com.sheild.service;

import com.sheild.domain.Platform;
import com.sheild.domain.ReviewStatus;
import com.sheild.dto.ReportDraftResponse;
import com.sheild.dto.UpdateDraftRequest;
import com.sheild.entity.*;
import com.sheild.repository.DocumentedUrlRepository;
import com.sheild.repository.EvidenceRepository;
import com.sheild.repository.IncidentRepository;
import com.sheild.repository.ReportDraftRepository;
import com.sheild.repository.SafetyCaseRepository;
import com.sheild.web.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ReportDraftService {

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("d MMMM yyyy 'at' HH:mm 'UTC'").withZone(ZoneOffset.UTC);

    private final ReportDraftRepository draftRepository;
    private final EvidenceRepository evidenceRepository;
    private final DocumentedUrlRepository urlRepository;
    private final IncidentRepository incidentRepository;
    private final SafetyCaseRepository caseRepository;
    private final AccessService accessService;
    private final ResponseMapper mapper;

    public ReportDraftService(ReportDraftRepository draftRepository, EvidenceRepository evidenceRepository,
                              DocumentedUrlRepository urlRepository, IncidentRepository incidentRepository,
                              SafetyCaseRepository caseRepository, AccessService accessService,
                              ResponseMapper mapper) {
        this.draftRepository = draftRepository;
        this.evidenceRepository = evidenceRepository;
        this.urlRepository = urlRepository;
        this.incidentRepository = incidentRepository;
        this.caseRepository = caseRepository;
        this.accessService = accessService;
        this.mapper = mapper;
    }

    @Transactional
    public ReportDraftResponse generate(Long incidentId, UserEntity user) {
        Incident incident = accessService.requireIncident(incidentId, user);
        ReportDraft existing = draftRepository.findByIncidentId(incidentId).orElse(null);
        if (existing != null) {
            return mapper.draft(existing);
        }
        if (incident.getReviewStatus() != ReviewStatus.REVIEWED
                || incident.getConfirmedSummary() == null || incident.getConfirmedSummary().isBlank()) {
            throw ApiException.conflict("Confirm the reviewed incident details before creating a report draft.");
        }
        String content = composeDraft(incident);
        String title = "Report draft — " + incident.getIncidentType().getLabel() + " on "
                + incident.getPlatform().getLabel();
        ReportDraft draft = new ReportDraft(incident.getSafetyCase(), incident, title, content);
        draftRepository.save(draft);
        SafetyCase safetyCase = incident.getSafetyCase();
        safetyCase.touch();
        caseRepository.save(safetyCase);
        return mapper.draft(draft);
    }

    @Transactional(readOnly = true)
    public List<ReportDraftResponse> listForCase(Long caseId, UserEntity user) {
        accessService.requireCase(caseId, user);
        return draftRepository.findBySafetyCaseIdOrderByUpdatedAtDesc(caseId).stream()
                .map(mapper::draft).toList();
    }

    @Transactional
    public ReportDraftResponse update(Long draftId, UpdateDraftRequest request, UserEntity user) {
        ReportDraft draft = accessService.requireDraft(draftId, user);
        draft.setContent(request.content().trim());
        if (request.title() != null && !request.title().isBlank()) {
            draft.setTitle(request.title().trim());
        }
        draftRepository.save(draft);
        draft.getSafetyCase().touch();
        caseRepository.save(draft.getSafetyCase());
        return mapper.draft(draft);
    }

    private String composeDraft(Incident incident) {
        List<DocumentedUrl> urls = urlRepository.findByIncidentIdOrderByCreatedAtAsc(incident.getId());
        List<Evidence> evidence = evidenceRepository.findByIncidentIdOrderByUploadedAtDesc(incident.getId());
        String platform = incident.getPlatform().getLabel();
        String recipient = switch (incident.getPlatform()) {
            case INSTAGRAM -> "Instagram Support";
            case FACEBOOK -> "Facebook Support";
            case WHATSAPP -> "WhatsApp Support";
            case OTHER -> "Platform Support";
        };
        StringBuilder sb = new StringBuilder();
        sb.append("DRAFT — NOT SUBMITTED\n\n");
        sb.append("To: ").append(recipient).append("\n");
        sb.append("Subject: Report of ").append(incident.getIncidentType().getLabel().toLowerCase())
                .append(" on ").append(platform).append("\n\n");
        sb.append("I am preparing a report about ").append(incident.getIncidentType().getLabel().toLowerCase())
                .append(" on ").append(platform).append(".\n\n");
        sb.append("Account or profile: ");
        List<DocumentedUrl> profiles = urls.stream()
                .filter(u -> u.getUrlKind() == com.sheild.domain.UrlKind.PROFILE).toList();
        if (profiles.isEmpty()) {
            sb.append("Not provided in this draft\n");
        } else {
            sb.append(profiles.get(0).getUrl()).append("\n");
        }
        List<DocumentedUrl> others = urls.stream()
                .filter(u -> u.getUrlKind() == com.sheild.domain.UrlKind.ADDITIONAL).toList();
        if (!others.isEmpty()) {
            sb.append("Other documented links:\n");
            for (DocumentedUrl u : others) sb.append("- ").append(u.getUrl()).append("\n");
        }
        sb.append("\nIncident date: ")
                .append(incident.getOccurredAt() == null ? "Unknown" : DATE_FORMAT.format(incident.getOccurredAt()))
                .append("\n\n");
        sb.append("What happened (reviewed by me):\n");
        sb.append(incident.getConfirmedSummary()).append("\n\n");
        sb.append("Evidence available in my records:\n");
        if (evidence.isEmpty()) {
            sb.append("No files attached\n");
        } else {
            for (Evidence e : evidence) {
                sb.append("- ").append(e.getOriginalFilename())
                        .append(" (").append(e.getMimeType()).append(", ")
                        .append(e.getFileSize()).append(" bytes)\n");
            }
        }
        sb.append("\nCase reference: ").append(incident.getSafetyCase().getReference()).append("\n\n");
        sb.append("Requested action:\n");
        sb.append("Please review the account or content described above against your community guidelines ")
                .append("and let me know what additional information you need. ")
                .append("Please do not treat this draft as a formal submission — I will send it myself through ")
                .append("the platform's official reporting channel.\n\n");
        sb.append("This draft was prepared with SHEild from information I reviewed and confirmed. ")
                .append("SHEild has not submitted it to any platform or authority.\n");
        return sb.toString();
    }
}
