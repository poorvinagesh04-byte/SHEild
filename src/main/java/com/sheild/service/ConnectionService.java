package com.sheild.service;

import com.sheild.dto.ConnectionResponse;
import com.sheild.entity.DocumentedUrl;
import com.sheild.entity.Incident;
import com.sheild.entity.IncidentConnection;
import com.sheild.entity.SafetyCase;
import com.sheild.entity.UserEntity;
import com.sheild.repository.DocumentedUrlRepository;
import com.sheild.repository.IncidentConnectionRepository;
import com.sheild.repository.IncidentRepository;
import com.sheild.web.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.util.*;

@Service
public class ConnectionService {

    private final IncidentConnectionRepository connectionRepository;
    private final IncidentRepository incidentRepository;
    private final DocumentedUrlRepository urlRepository;
    private final AccessService accessService;
    private final ResponseMapper mapper;

    public ConnectionService(IncidentConnectionRepository connectionRepository, IncidentRepository incidentRepository,
                             DocumentedUrlRepository urlRepository, AccessService accessService,
                             ResponseMapper mapper) {
        this.connectionRepository = connectionRepository;
        this.incidentRepository = incidentRepository;
        this.urlRepository = urlRepository;
        this.accessService = accessService;
        this.mapper = mapper;
    }

    @Transactional
    public List<ConnectionResponse> list(Long caseId, UserEntity user) {
        SafetyCase safetyCase = accessService.requireCase(caseId, user);
        generateSuggestions(safetyCase);
        List<IncidentConnection> all = connectionRepository.findBySafetyCaseIdOrderByCreatedAtDesc(caseId);
        all.sort(Comparator
                .comparingInt((IncidentConnection c) -> switch (c.getStatus()) {
                    case CONFIRMED -> 0;
                    case SUGGESTED -> 1;
                    case DISMISSED -> 2;
                })
                .thenComparing(IncidentConnection::getCreatedAt, Comparator.reverseOrder()));
        return all.stream().map(mapper::connection).toList();
    }

    @Transactional
    public ConnectionResponse decide(Long connectionId, String requestedStatus, UserEntity user) {
        IncidentConnection connection = accessService.requireConnection(connectionId, user);
        com.sheild.domain.ConnectionStatus status;
        try {
            status = com.sheild.domain.ConnectionStatus.valueOf(requestedStatus);
        } catch (Exception ex) {
            throw ApiException.badRequest("Choose either CONFIRMED or DISMISSED.");
        }
        if (status == com.sheild.domain.ConnectionStatus.SUGGESTED) {
            throw ApiException.badRequest("Choose either CONFIRMED or DISMISSED.");
        }
        connection.setStatus(status);
        connectionRepository.save(connection);
        connection.getSafetyCase().touch();
        return mapper.connection(connection);
    }

    private void generateSuggestions(SafetyCase safetyCase) {
        List<Incident> incidents = incidentRepository.findForCase(safetyCase.getId());
        if (incidents.size() < 2) return;

        for (int i = 0; i < incidents.size(); i++) {
            for (int j = i + 1; j < incidents.size(); j++) {
                Incident a = incidents.get(i);
                Incident b = incidents.get(j);
                Incident first = a.getId() <= b.getId() ? a : b;
                Incident second = a.getId() <= b.getId() ? b : a;
                if (connectionRepository.existsBySafetyCaseIdAndIncidentAIdAndIncidentBId(
                        safetyCase.getId(), first.getId(), second.getId())) {
                    continue;
                }
                Suggestion suggestion = buildSuggestion(first, second);
                if (suggestion == null) continue;
                connectionRepository.save(new IncidentConnection(safetyCase, first, second,
                        suggestion.reason, suggestion.basis));
            }
        }
    }

    private Suggestion buildSuggestion(Incident a, Incident b) {
        List<DocumentedUrl> urlsA = urlRepository.findByIncidentIdOrderByCreatedAtAsc(a.getId());
        List<DocumentedUrl> urlsB = urlRepository.findByIncidentIdOrderByCreatedAtAsc(b.getId());

        Map<String, String> canonicalA = new LinkedHashMap<>();
        for (DocumentedUrl u : urlsA) canonicalA.putIfAbsent(canonicalUrl(u.getUrl()), u.getUrl());
        for (DocumentedUrl u : urlsB) {
            String shared = canonicalA.get(canonicalUrl(u.getUrl()));
            if (shared != null) {
                return new Suggestion(
                        "Both incidents document the same link: " + ResponseMapper.hostOf(shared)
                                + ". Review whether they describe related activity. This is a documented similarity, not proof of identity.",
                        com.sheild.domain.ConnectionBasis.SHARED_LINK);
            }
        }

        if (a.getPlatform() == b.getPlatform()) {
            Set<String> handlesA = new HashSet<>();
            for (DocumentedUrl u : urlsA) {
                String handle = handleOf(u.getUrl(), a.getPlatform());
                if (handle != null) handlesA.add(handle.toLowerCase(Locale.ROOT));
            }
            for (DocumentedUrl u : urlsB) {
                String handle = handleOf(u.getUrl(), b.getPlatform());
                if (handle != null && handlesA.contains(handle.toLowerCase(Locale.ROOT))) {
                    return new Suggestion(
                            "Both incidents reference the same account identifier on "
                                    + a.getPlatform().getLabel() + ": @" + handle
                                    + ". This comparison uses only the URLs you documented; it does not identify a person.",
                            com.sheild.domain.ConnectionBasis.SHARED_HANDLE);
                }
            }
        }

        if (a.getPlatform() == b.getPlatform() && a.getIncidentType() == b.getIncidentType()) {
            return new Suggestion(
                    "Both incidents are described as " + a.getIncidentType().getLabel().toLowerCase(Locale.ROOT)
                            + " on " + a.getPlatform().getLabel()
                            + ". This is a contextual similarity worth reviewing, not proof that the incidents are connected.",
                    com.sheild.domain.ConnectionBasis.SIMILAR_CONTEXT);
        }
        return null;
    }

    private String canonicalUrl(String url) {
        try {
            URI uri = URI.create(url).normalize();
            String path = uri.getPath() == null ? "" : uri.getPath();
            while (path.endsWith("/") && path.length() > 1) path = path.substring(0, path.length() - 1);
            String query = uri.getQuery();
            if (query != null) {
                query = Arrays.stream(query.split("&"))
                        .filter(part -> !part.toLowerCase(Locale.ROOT).startsWith("utm_"))
                        .reduce((x, y) -> x + "&" + y).orElse("");
                if (query.isEmpty()) query = null;
            }
            return (uri.getScheme() == null ? "https" : uri.getScheme().toLowerCase(Locale.ROOT)) + "://"
                    + (uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT))
                    + path + (query == null ? "" : "?" + query);
        } catch (Exception ex) {
            return url;
        }
    }

    private String handleOf(String url, com.sheild.domain.Platform platform) {
        try {
            URI uri = URI.create(url);
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            String path = uri.getPath() == null ? "" : uri.getPath();
            String[] segments = Arrays.stream(path.split("/")).filter(s -> !s.isBlank()).toArray(String[]::new);
            if (segments.length == 0) return null;
            if (platform == com.sheild.domain.Platform.INSTAGRAM && host.contains("instagram.com")) {
                if (Set.of("p", "reel", "reels", "stories", "explore", "accounts").contains(segments[0])) return null;
                return segments[0];
            }
            if (platform == com.sheild.domain.Platform.FACEBOOK && host.contains("facebook.com")) {
                if (Set.of("profile.php", "groups", "watch", "share", "reel", "stories").contains(segments[0])) return null;
                return segments[0];
            }
            if (platform == com.sheild.domain.Platform.WHATSAPP) {
                if (host.contains("wa.me") || host.contains("api.whatsapp.com")) return segments[0];
            }
        } catch (Exception ignored) {
            return null;
        }
        return null;
    }

    private record Suggestion(String reason, com.sheild.domain.ConnectionBasis basis) {
    }
}
