package com.sheild.service;

import com.sheild.domain.ProcessingStatus;
import com.sheild.domain.ReviewStatus;
import com.sheild.dto.EvidenceResponse;
import com.sheild.entity.Evidence;
import com.sheild.entity.Incident;
import com.sheild.entity.SafetyCase;
import com.sheild.entity.UserEntity;
import com.sheild.repository.EvidenceRepository;
import com.sheild.repository.SafetyCaseRepository;
import com.sheild.web.ApiException;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.util.List;

@Service
public class EvidenceService {

    private final EvidenceRepository evidenceRepository;
    private final SafetyCaseRepository caseRepository;
    private final AccessService accessService;
    private final ResponseMapper mapper;
    private final EvidenceStorageService storage;

    public EvidenceService(EvidenceRepository evidenceRepository, SafetyCaseRepository caseRepository,
                           AccessService accessService, ResponseMapper mapper, EvidenceStorageService storage) {
        this.evidenceRepository = evidenceRepository;
        this.caseRepository = caseRepository;
        this.accessService = accessService;
        this.mapper = mapper;
        this.storage = storage;
    }

    @Transactional
    public EvidenceResponse upload(Long incidentId, MultipartFile file, String note, UserEntity user) {
        Incident incident = accessService.requireIncident(incidentId, user);
        if (note != null && note.length() > 500) {
            throw ApiException.badRequest("The evidence note must be 500 characters or fewer.");
        }
        EvidenceStorageService.StoredFile stored = storage.store(file);
        Evidence evidence = new Evidence(incident, stored.originalFilename(), stored.storedFilename(),
                stored.mimeType(), stored.size());
        evidence.setUserNote(note == null || note.isBlank() ? null : note.trim());
        if ("text/plain".equals(stored.mimeType())) {
            String text = storage.extractTextIfPlain(stored.path());
            if (text != null && !text.isBlank()) {
                evidence.setExtractedText(text);
                evidence.setProcessingStatus(ProcessingStatus.TEXT_EXTRACTED);
            } else {
                evidence.setProcessingStatus(ProcessingStatus.OCR_NOT_CONFIGURED);
            }
        } else {
            evidence.setProcessingStatus(ProcessingStatus.OCR_NOT_CONFIGURED);
        }
        if (incident.getReviewStatus() == ReviewStatus.REVIEWED) {
            evidence.setReviewStatus(ReviewStatus.REVIEWED);
        }
        try {
            evidenceRepository.save(evidence);
        } catch (RuntimeException ex) {
            storage.delete(stored.storedFilename());
            throw ex;
        }
        SafetyCase safetyCase = incident.getSafetyCase();
        safetyCase.touch();
        caseRepository.save(safetyCase);
        return mapper.evidence(evidence);
    }

    @Transactional(readOnly = true)
    public List<EvidenceResponse> listForIncident(Long incidentId, UserEntity user) {
        accessService.requireIncident(incidentId, user);
        return evidenceRepository.findByIncidentIdOrderByUploadedAtDesc(incidentId).stream()
                .map(mapper::evidence).toList();
    }

    @Transactional(readOnly = true)
    public List<EvidenceResponse> listForCase(Long caseId, UserEntity user) {
        accessService.requireCase(caseId, user);
        return evidenceRepository.findForCase(caseId).stream().map(mapper::evidence).toList();
    }

    @Transactional(readOnly = true)
    public EvidenceResponse get(Long evidenceId, UserEntity user) {
        return mapper.evidence(accessService.requireEvidence(evidenceId, user));
    }

    @Transactional(readOnly = true)
    public DownloadedEvidence download(Long evidenceId, UserEntity user) {
        Evidence evidence = accessService.requireEvidence(evidenceId, user);
        Resource resource = storage.load(evidence);
        return new DownloadedEvidence(resource, evidence.getOriginalFilename(), evidence.getMimeType(),
                EvidenceStorageService.isImage(evidence.getMimeType())
                        || "application/pdf".equals(evidence.getMimeType())
                        || "text/plain".equals(evidence.getMimeType()));
    }

    @Transactional
    public void delete(Long evidenceId, UserEntity user) {
        Evidence evidence = accessService.requireEvidence(evidenceId, user);
        String stored = evidence.getStoredFilename();
        SafetyCase safetyCase = evidence.getIncident().getSafetyCase();
        evidenceRepository.delete(evidence);
        safetyCase.touch();
        caseRepository.save(safetyCase);
        storage.delete(stored);
    }

    public record DownloadedEvidence(Resource resource, String filename, String mimeType, boolean inline) {
    }
}
