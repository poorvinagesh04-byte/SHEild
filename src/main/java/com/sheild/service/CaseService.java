package com.sheild.service;

import com.sheild.domain.CaseStatus;
import com.sheild.dto.CaseResponse;
import com.sheild.dto.ChecklistItemResponse;
import com.sheild.dto.UpdateCaseRequest;
import com.sheild.entity.ChecklistItem;
import com.sheild.entity.Evidence;
import com.sheild.entity.Incident;
import com.sheild.entity.SafetyCase;
import com.sheild.entity.UserEntity;
import com.sheild.repository.ChecklistItemRepository;
import com.sheild.repository.DocumentedUrlRepository;
import com.sheild.repository.EvidenceRepository;
import com.sheild.repository.IncidentRepository;
import com.sheild.repository.SafetyCaseRepository;
import com.sheild.web.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Year;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class CaseService {

    private static final char[] REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private static final SecureRandom RANDOM = new SecureRandom();

    private final SafetyCaseRepository caseRepository;
    private final DocumentedUrlRepository urlRepository;
    private final ChecklistItemRepository checklistRepository;
    private final EvidenceRepository evidenceRepository;
    private final IncidentRepository incidentRepository;
    private final AccessService accessService;
    private final ResponseMapper mapper;
    private final EvidenceStorageService storageService;

    public CaseService(SafetyCaseRepository caseRepository, DocumentedUrlRepository urlRepository,
                       ChecklistItemRepository checklistRepository,
                       EvidenceRepository evidenceRepository, IncidentRepository incidentRepository,
                       AccessService accessService, ResponseMapper mapper,
                       EvidenceStorageService storageService) {
        this.caseRepository = caseRepository;
        this.urlRepository = urlRepository;
        this.checklistRepository = checklistRepository;
        this.evidenceRepository = evidenceRepository;
        this.incidentRepository = incidentRepository;
        this.accessService = accessService;
        this.mapper = mapper;
        this.storageService = storageService;
    }

    @Transactional
    public CaseResponse create(UserEntity user, String requestedTitle) {
        String title = requestedTitle == null || requestedTitle.isBlank()
                ? "My safety case" : requestedTitle.trim();
        if (title.length() > 160) {
            throw ApiException.badRequest("Case title must be 160 characters or fewer.");
        }
        SafetyCase safetyCase = new SafetyCase(newReference(), title, user);
        caseRepository.save(safetyCase);
        seedChecklist(safetyCase);
        return mapper.caseInfo(safetyCase);
    }

    @Transactional(readOnly = true)
    public List<CaseResponse> list(UserEntity user) {
        return caseRepository.findByOwnerIdOrderByUpdatedAtDesc(user.getId()).stream()
                .map(mapper::caseInfo).toList();
    }

    @Transactional(readOnly = true)
    public CaseResponse get(Long caseId, UserEntity user) {
        return mapper.caseInfo(accessService.requireCase(caseId, user));
    }

    @Transactional
    public CaseResponse update(Long caseId, UpdateCaseRequest request, UserEntity user) {
        SafetyCase safetyCase = accessService.requireCase(caseId, user);
        if (request.title() != null && !request.title().isBlank()) {
            safetyCase.setTitle(request.title().trim());
        }
        safetyCase.touch();
        caseRepository.save(safetyCase);
        return mapper.caseInfo(safetyCase);
    }

    @Transactional
    public void delete(Long caseId, UserEntity user) {
        SafetyCase safetyCase = accessService.requireCase(caseId, user);
        for (Evidence evidence : evidenceRepository.findForCase(caseId)) {
            storageService.delete(evidence.getStoredFilename());
        }
        // Database foreign keys cascade to incidents, evidence rows, URLs, connections, drafts, and checklist items.
        caseRepository.delete(safetyCase);
    }

    @Transactional(readOnly = true)
    public List<ChecklistItemResponse> checklist(Long caseId, UserEntity user) {
        accessService.requireCase(caseId, user);
        return checklistRepository.findBySafetyCaseIdOrderBySortOrderAsc(caseId).stream()
                .map(mapper::checklist).toList();
    }

    @Transactional(readOnly = true)
    public List<com.sheild.dto.UrlResponse> urls(Long caseId, UserEntity user) {
        accessService.requireCase(caseId, user);
        return urlRepository.findBySafetyCaseIdOrderByCreatedAtDesc(caseId).stream()
                .map(mapper::url).toList();
    }

    @Transactional
    public ChecklistItemResponse updateChecklist(Long itemId, boolean done, UserEntity user) {
        ChecklistItem item = accessService.requireChecklistItem(itemId, user);
        item.setDone(done);
        checklistRepository.save(item);
        SafetyCase safetyCase = item.getSafetyCase();
        if (done) {
            safetyCase.setStatus(CaseStatus.IN_PROGRESS);
        }
        safetyCase.touch();
        caseRepository.save(safetyCase);
        return mapper.checklist(item);
    }

    @Transactional
    public String summaryText(Long caseId, UserEntity user) {
        SafetyCase c = accessService.requireCase(caseId, user);
        StringBuilder sb = new StringBuilder();
        sb.append("SHEild case summary\n");
        sb.append("===================\n\n");
        sb.append("Case reference: ").append(c.getReference()).append("\n");
        sb.append("Title: ").append(c.getTitle()).append("\n");
        sb.append("Status: ").append(c.getStatus().getLabel()).append("\n");
        sb.append("Created: ").append(c.getCreatedAt()).append("\n");
        sb.append("Last updated: ").append(c.getUpdatedAt()).append("\n");
        List<Incident> incidents = incidentRepository.findForCase(caseId);
        sb.append("Incidents documented: ").append(incidents.size()).append("\n");
        sb.append("Evidence items: ").append(evidenceRepository.countForCase(caseId)).append("\n\n");
        sb.append("This summary is generated from information saved in your SHEild case. ")
                .append("It is not a report to any platform or authority.\n\n");
        if (!incidents.isEmpty()) {
            sb.append("Incident timeline\n-----------------\n");
            for (Incident incident : incidents) {
                sb.append("- ").append(incident.getIncidentType().getLabel())
                        .append(" on ").append(incident.getPlatform().getLabel())
                        .append(" | review: ").append(incident.getReviewStatus().name())
                        .append(" | recorded: ").append(incident.getCreatedAt()).append("\n");
            }
            sb.append("\n");
        }
        if (c.getConfirmedSummary() != null && !c.getConfirmedSummary().isBlank()) {
            sb.append("Reviewed information\n--------------------\n");
            sb.append(c.getConfirmedSummary()).append("\n\n");
        } else {
            sb.append("No reviewed incident summaries have been confirmed yet.\n\n");
        }
        sb.append("Share this only with people you trust.\n");
        return sb.toString();
    }

    private void seedChecklist(SafetyCase safetyCase) {
        List<String[]> defaults = List.of(
                new String[]{"preserve-evidence", "Review and preserve evidence",
                        "Open your evidence library and check that the files you want to keep are attached."},
                new String[]{"confirm-details", "Confirm incident details",
                        "Review the drafted summary and correct anything that is not accurate."},
                new String[]{"account-security", "Review account privacy and security",
                        "Consider stronger passwords, two-factor authentication, and who can contact you."},
                new String[]{"prepare-report", "Prepare a report",
                        "Create an editable draft. Nothing is sent automatically."},
                new String[]{"official-resource", "Visit an official reporting resource",
                        "Use a platform help page or the National Cyber Crime Reporting Portal if you choose to."},
                new String[]{"seek-support", "Seek support if needed",
                        "Reach out to a trusted person or use the SHEild support companion."}
        );
        int order = 1;
        for (String[] item : defaults) {
            checklistRepository.save(new ChecklistItem(safetyCase, item[0], item[1], item[2], order++));
        }
    }

    private String newReference() {
        int year = Year.now(ZoneOffset.UTC).getValue();
        for (int attempt = 0; attempt < 20; attempt++) {
            StringBuilder sb = new StringBuilder("SH-").append(year).append('-');
            for (int i = 0; i < 6; i++) {
                sb.append(REFERENCE_ALPHABET[RANDOM.nextInt(REFERENCE_ALPHABET.length)]);
            }
            String reference = sb.toString();
            if (!caseRepository.existsByReference(reference)) {
                return reference;
            }
        }
        throw new IllegalStateException("Could not allocate a unique case reference.");
    }
}
