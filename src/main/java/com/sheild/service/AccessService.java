package com.sheild.service;

import com.sheild.entity.*;
import com.sheild.repository.*;
import com.sheild.web.ApiException;
import org.springframework.stereotype.Service;

@Service
public class AccessService {

    private final SafetyCaseRepository caseRepository;
    private final IncidentRepository incidentRepository;
    private final EvidenceRepository evidenceRepository;
    private final IncidentConnectionRepository connectionRepository;
    private final ReportDraftRepository draftRepository;
    private final ChecklistItemRepository checklistRepository;

    public AccessService(SafetyCaseRepository caseRepository, IncidentRepository incidentRepository,
                         EvidenceRepository evidenceRepository, IncidentConnectionRepository connectionRepository,
                         ReportDraftRepository draftRepository, ChecklistItemRepository checklistRepository) {
        this.caseRepository = caseRepository;
        this.incidentRepository = incidentRepository;
        this.evidenceRepository = evidenceRepository;
        this.connectionRepository = connectionRepository;
        this.draftRepository = draftRepository;
        this.checklistRepository = checklistRepository;
    }

    public SafetyCase requireCase(Long caseId, UserEntity user) {
        return caseRepository.findByIdAndOwnerId(caseId, user.getId())
                .orElseThrow(() -> ApiException.notFound("That case could not be found in this access session."));
    }

    public Incident requireIncident(Long incidentId, UserEntity user) {
        return incidentRepository.findOwned(incidentId, user.getId())
                .orElseThrow(() -> ApiException.notFound("That incident could not be found in this access session."));
    }

    public Evidence requireEvidence(Long evidenceId, UserEntity user) {
        return evidenceRepository.findOwned(evidenceId, user.getId())
                .orElseThrow(() -> ApiException.notFound("That evidence item could not be found in this access session."));
    }

    public IncidentConnection requireConnection(Long connectionId, UserEntity user) {
        return connectionRepository.findOwned(connectionId, user.getId())
                .orElseThrow(() -> ApiException.notFound("That connection suggestion could not be found."));
    }

    public ReportDraft requireDraft(Long draftId, UserEntity user) {
        return draftRepository.findOwned(draftId, user.getId())
                .orElseThrow(() -> ApiException.notFound("That report draft could not be found."));
    }

    public ChecklistItem requireChecklistItem(Long itemId, UserEntity user) {
        return checklistRepository.findOwned(itemId, user.getId())
                .orElseThrow(() -> ApiException.notFound("That checklist item could not be found."));
    }
}
