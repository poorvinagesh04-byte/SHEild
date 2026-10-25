package com.sheild.service;

import com.sheild.domain.IncidentType;
import com.sheild.domain.Platform;
import com.sheild.domain.ReviewStatus;
import com.sheild.domain.UrlKind;
import com.sheild.dto.*;
import com.sheild.entity.*;
import com.sheild.repository.*;
import com.sheild.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class IncidentService {

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("d MMM yyyy 'at' HH:mm 'UTC'").withZone(ZoneOffset.UTC);

    private final IncidentRepository incidentRepository;
    private final SafetyCaseRepository caseRepository;
    private final DocumentedUrlRepository urlRepository;
    private final EvidenceRepository evidenceRepository;
    private final AccessService accessService;
    private final ResponseMapper mapper;

    public IncidentService(IncidentRepository incidentRepository, SafetyCaseRepository caseRepository,
                           DocumentedUrlRepository urlRepository, EvidenceRepository evidenceRepository,
                           AccessService accessService, ResponseMapper mapper) {
        this.incidentRepository = incidentRepository;
        this.caseRepository = caseRepository;
        this.urlRepository = urlRepository;
        this.evidenceRepository = evidenceRepository;
        this.accessService = accessService;
        this.mapper = mapper;
    }

    @Transactional
    public IncidentResponse create(Long caseId, IncidentRequest request, UserEntity user) {
        SafetyCase safetyCase = accessService.requireCase(caseId, user);
        ValidatedInput input = validate(request, true);

        Incident incident = new Incident(safetyCase, input.type, input.platform, input.description);
        incident.setOccurredAt(input.occurredAt);
        incident.setImpactNotes(input.impactNotes);
        incident.setReviewStatus(request.draft() ? ReviewStatus.DRAFT : ReviewStatus.NEEDS_REVIEW);
        incidentRepository.save(incident);
        syncUrls(safetyCase, incident, input);
        safetyCase.touch();
        caseRepository.save(safetyCase);
        return mapper.incident(incident);
    }

    @Transactional
    public IncidentResponse update(Long incidentId, IncidentRequest request, UserEntity user) {
        Incident incident = accessService.requireIncident(incidentId, user);
        ValidatedInput input = validate(request, false);

        boolean changed = !Objects.equals(incident.getIncidentType(), input.type)
                || !Objects.equals(incident.getPlatform(), input.platform)
                || !Objects.equals(incident.getDescription(), input.description)
                || !Objects.equals(incident.getOccurredAt(), input.occurredAt)
                || !Objects.equals(incident.getImpactNotes(), input.impactNotes)
                || urlsChanged(incident, input);

        incident.setIncidentType(input.type);
        incident.setPlatform(input.platform);
        incident.setDescription(input.description);
        incident.setOccurredAt(input.occurredAt);
        incident.setImpactNotes(input.impactNotes);
        if (changed) {
            if (incident.getReviewStatus() == ReviewStatus.REVIEWED) {
                incident.resetReview();
            } else if (incident.getReviewStatus() == ReviewStatus.DRAFT && !request.draft()) {
                incident.setReviewStatus(ReviewStatus.NEEDS_REVIEW);
            }
            incident.touch();
        }
        incidentRepository.save(incident);
        syncUrls(incident.getSafetyCase(), incident, input);
        SafetyCase safetyCase = incident.getSafetyCase();
        safetyCase.touch();
        caseRepository.save(safetyCase);
        return mapper.incident(incident);
    }

    @Transactional(readOnly = true)
    public List<IncidentResponse> listForCase(Long caseId, UserEntity user) {
        accessService.requireCase(caseId, user);
        return incidentRepository.findForCase(caseId).stream().map(mapper::incident).toList();
    }

    @Transactional(readOnly = true)
    public IncidentResponse get(Long incidentId, UserEntity user) {
        return mapper.incident(accessService.requireIncident(incidentId, user));
    }

    @Transactional
    public ReviewResponse generateReview(Long incidentId, UserEntity user) {
        Incident incident = accessService.requireIncident(incidentId, user);
        List<DocumentedUrl> urls = urlRepository.findByIncidentIdOrderByCreatedAtAsc(incidentId);
        long evidenceCount = evidenceRepository.countForIncident(incidentId);
        String summary = buildSuggestedSummary(incident, urls, evidenceCount);
        incident.setSuggestedSummary(summary);
        if (incident.getReviewStatus() == ReviewStatus.DRAFT) {
            incident.setReviewStatus(ReviewStatus.NEEDS_REVIEW);
        }
        incidentRepository.save(incident);

        List<String> missing = new ArrayList<>();
        if (incident.getOccurredAt() == null) missing.add("The approximate date and time are unknown.");
        if (urls.isEmpty()) missing.add("No profile or supporting link has been documented.");
        if (evidenceCount == 0) missing.add("No evidence files are attached.");
        if (isBlank(incident.getImpactNotes())) missing.add("No notes about impact or repetition have been added.");
        if (incident.getDescription() != null && incident.getDescription().trim().length() < 40) {
            missing.add("The description is brief. Consider adding what happened, where, and how often.");
        }
        List<String> provenance = List.of(
                "Generated only from the details you entered. No external AI service or OCR was used.",
                "The original incident wording is kept separately and is not overwritten.",
                "Check every sentence. Correct anything that is inaccurate before confirming."
        );
        return new ReviewResponse(incident.getId(), summary, missing, provenance, incident.getSummaryGeneratedAt(),
                incident.getReviewStatus().name(), evidenceCount, "RULE_BASED");
    }

    @Transactional
    public IncidentResponse confirmSummary(Long incidentId, String summary, UserEntity user) {
        Incident incident = accessService.requireIncident(incidentId, user);
        String cleaned = summary == null ? "" : summary.trim();
        if (cleaned.isEmpty()) {
            throw ApiException.badRequest("Please confirm or write a summary before saving.");
        }
        if (cleaned.length() > 20000) {
            throw ApiException.badRequest("Summary must be 20,000 characters or fewer.");
        }
        incident.setConfirmedSummary(cleaned);
        incidentRepository.save(incident);

        for (Evidence evidence : evidenceRepository.findByIncidentIdOrderByUploadedAtDesc(incidentId)) {
            evidence.setReviewStatus(ReviewStatus.REVIEWED);
            evidenceRepository.save(evidence);
        }

        SafetyCase safetyCase = incident.getSafetyCase();
        StringBuilder aggregate = new StringBuilder();
        List<Incident> reviewed = incidentRepository.findForCase(safetyCase.getId()).stream()
                .filter(i -> i.getReviewStatus() == ReviewStatus.REVIEWED
                        && i.getConfirmedSummary() != null && !i.getConfirmedSummary().isBlank())
                .toList();
        for (int i = 0; i < reviewed.size(); i++) {
            if (i > 0) aggregate.append("\n\n");
            aggregate.append("Incident ").append(i + 1).append(" — ")
                    .append(reviewed.get(i).getIncidentType().getLabel())
                    .append(" on ").append(reviewed.get(i).getPlatform().getLabel()).append("\n")
                    .append(reviewed.get(i).getConfirmedSummary());
        }
        safetyCase.setConfirmedSummary(aggregate.toString());
        safetyCase.setStatus(com.sheild.domain.CaseStatus.IN_PROGRESS);
        safetyCase.touch();
        caseRepository.save(safetyCase);
        return mapper.incident(incident);
    }

    private ValidatedInput validate(IncidentRequest request, boolean creatingDraftAllowed) {
        Map<String, String> errors = new LinkedHashMap<>();
        boolean draft = request.draft();
        IncidentType type = request.incidentType();
        Platform platform = request.platform();

        if (type == null) {
            if (!draft) errors.put("incidentType", "Choose the type of incident.");
            type = IncidentType.OTHER;
        }
        if (platform == null) {
            if (!draft) errors.put("platform", "Choose where this happened.");
            platform = Platform.OTHER;
        }
        String description = request.description() == null ? "" : request.description().trim();
        if (!draft && description.isEmpty()) {
            errors.put("description", "Describe what happened so your case record is useful.");
        }
        if (description.length() > 20000) {
            errors.put("description", "Description must be 20,000 characters or fewer.");
        }
        if (request.occurredAt() != null && request.occurredAt().isAfter(Instant.now().plusSeconds(86400))) {
            errors.put("occurredAt", "The incident date cannot be in the future.");
        }
        String impact = blankToNull(request.impactNotes());
        if (impact != null && impact.length() > 5000) {
            errors.put("impactNotes", "Impact notes must be 5,000 characters or fewer.");
        }

        String profileUrl = normalizeUrl(request.profileUrl(), "profileUrl", errors);
        List<String> additional = new ArrayList<>();
        if (request.additionalUrls() != null) {
            if (request.additionalUrls().size() > 10) {
                errors.put("additionalUrls", "You can add up to 10 additional links.");
            }
            Set<String> seen = new HashSet<>();
            for (String raw : request.additionalUrls()) {
                String normalized = normalizeUrl(raw, "additionalUrls", errors);
                if (normalized != null && seen.add(normalized.toLowerCase(Locale.ROOT))) {
                    additional.add(normalized);
                }
            }
        }
        if (!errors.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please check the highlighted fields.", errors);
        }
        return new ValidatedInput(type, platform, description, request.occurredAt(), impact,
                profileUrl, additional);
    }

    private String normalizeUrl(String value, String field, Map<String, String> errors) {
        if (value == null || value.isBlank()) return null;
        String trimmed = value.trim();
        if (trimmed.length() > 2048) {
            errors.put(field, "Each link must be 2,048 characters or fewer.");
            return null;
        }
        if (trimmed.chars().anyMatch(Character::isISOControl)) {
            errors.put(field, "That link contains invalid characters.");
            return null;
        }
        if (!trimmed.contains("://")) {
            trimmed = "https://" + trimmed;
        }
        try {
            URI uri = new URI(trimmed);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            if (!scheme.equals("http") && !scheme.equals("https")) {
                errors.put(field, "Only http:// and https:// links are supported.");
                return null;
            }
            if (uri.getHost() == null || uri.getHost().isBlank()) {
                errors.put(field, "That link does not contain a valid website address.");
                return null;
            }
            if (uri.getUserInfo() != null) {
                errors.put(field, "Links containing a username or password are not accepted.");
                return null;
            }
            return uri.toString();
        } catch (Exception ex) {
            errors.put(field, "That link is not a valid URL.");
            return null;
        }
    }

    private void syncUrls(SafetyCase safetyCase, Incident incident, ValidatedInput input) {
        urlRepository.deleteByIncidentId(incident.getId());
        urlRepository.flush();
        if (input.profileUrl != null) {
            DocumentedUrl u = new DocumentedUrl(safetyCase, incident, input.platform, input.profileUrl, UrlKind.PROFILE);
            u.setDisplayLabel("Profile or account");
            urlRepository.save(u);
        }
        for (String url : input.additionalUrls) {
            DocumentedUrl u = new DocumentedUrl(safetyCase, incident, input.platform, url, UrlKind.ADDITIONAL);
            u.setDisplayLabel("Additional link");
            urlRepository.save(u);
        }
    }

    private boolean urlsChanged(Incident incident, ValidatedInput input) {
        List<DocumentedUrl> existing = urlRepository.findByIncidentIdOrderByCreatedAtAsc(incident.getId());
        List<String> existingUrls = existing.stream().map(DocumentedUrl::getUrl).toList();
        List<String> newUrls = new ArrayList<>();
        if (input.profileUrl != null) newUrls.add(input.profileUrl);
        newUrls.addAll(input.additionalUrls);
        return !existingUrls.equals(newUrls);
    }

    private String buildSuggestedSummary(Incident incident, List<DocumentedUrl> urls, long evidenceCount) {
        StringBuilder sb = new StringBuilder();
        sb.append("On ")
                .append(incident.getOccurredAt() == null ? "an unknown date" : DATE_FORMAT.format(incident.getOccurredAt()))
                .append(", the user recorded ")
                .append(article(incident.getIncidentType().getLabel()))
                .append(incident.getIncidentType().getLabel().toLowerCase(Locale.ROOT))
                .append(" incident on ")
                .append(incident.getPlatform().getLabel())
                .append(".");
        String description = incident.getDescription() == null ? "" : incident.getDescription().trim()
                .replaceAll("\\s+", " ");
        if (!description.isEmpty()) {
            sb.append("\n\nWhat was described: ").append(truncate(description, 700));
        }
        if (!urls.isEmpty()) {
            sb.append("\n\nDocumented link").append(urls.size() > 1 ? "s" : "").append(": ");
            sb.append(String.join(", ", urls.stream().limit(3).map(DocumentedUrl::getUrl).toList()));
            if (urls.size() > 3) sb.append(" (and ").append(urls.size() - 3).append(" more)");
            sb.append(".");
        } else {
            sb.append("\n\nNo profile or supporting link was documented.");
        }
        sb.append("\n\nEvidence attached: ").append(evidenceCount).append(" file")
                .append(evidenceCount == 1 ? "" : "s").append(".");
        if (!isBlank(incident.getImpactNotes())) {
            sb.append("\n\nImpact or repetition notes: ")
                    .append(truncate(incident.getImpactNotes().trim().replaceAll("\\s+", " "), 400));
        }
        sb.append("\n\nThis draft only restates information supplied by the user. ")
                .append("It does not verify the content, identify anyone, or confirm that material is manipulated.");
        return sb.toString();
    }

    private String article(String text) {
        return text.matches("^[AEIOU].*") ? "an " : "a ";
    }

    private String truncate(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max).trim() + "…";
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record ValidatedInput(IncidentType type, Platform platform, String description, Instant occurredAt,
                                  String impactNotes, String profileUrl, List<String> additionalUrls) {
    }
}
