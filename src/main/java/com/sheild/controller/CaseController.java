package com.sheild.controller;

import com.sheild.dto.*;
import com.sheild.entity.UserEntity;
import com.sheild.security.AuthInterceptor;
import com.sheild.service.*;
import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/cases")
public class CaseController {

    private final CaseService caseService;
    private final IncidentService incidentService;
    private final EvidenceService evidenceService;
    private final ConnectionService connectionService;
    private final ReportDraftService draftService;
    private final DashboardService dashboardService;

    public CaseController(CaseService caseService, IncidentService incidentService,
                          EvidenceService evidenceService, ConnectionService connectionService,
                          ReportDraftService draftService, DashboardService dashboardService) {
        this.caseService = caseService;
        this.incidentService = incidentService;
        this.evidenceService = evidenceService;
        this.connectionService = connectionService;
        this.draftService = draftService;
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public List<CaseResponse> list(@RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        return caseService.list(user);
    }

    @PostMapping
    public ResponseEntity<CaseResponse> create(@Valid @RequestBody(required = false) CreateCaseRequest request,
                                               @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        CaseResponse response = caseService.create(user, request == null ? null : request.title());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{caseId}")
    public CaseResponse get(@PathVariable Long caseId,
                            @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        return caseService.get(caseId, user);
    }

    @PutMapping("/{caseId}")
    public CaseResponse update(@PathVariable Long caseId, @Valid @RequestBody UpdateCaseRequest request,
                               @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        return caseService.update(caseId, request, user);
    }

    @DeleteMapping("/{caseId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long caseId,
                       @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        caseService.delete(caseId, user);
    }

    @GetMapping("/{caseId}/dashboard")
    public DashboardResponse dashboard(@PathVariable Long caseId,
                                       @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        return dashboardService.get(caseId, user);
    }

    @GetMapping("/{caseId}/incidents")
    public List<IncidentResponse> incidents(@PathVariable Long caseId,
                                            @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        return incidentService.listForCase(caseId, user);
    }

    @PostMapping("/{caseId}/incidents")
    public ResponseEntity<IncidentResponse> createIncident(@PathVariable Long caseId,
                                                           @Valid @RequestBody IncidentRequest request,
                                                           @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(incidentService.create(caseId, request, user));
    }

    @GetMapping("/{caseId}/evidence")
    public List<EvidenceResponse> evidence(@PathVariable Long caseId,
                                           @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        return evidenceService.listForCase(caseId, user);
    }

    @GetMapping("/{caseId}/urls")
    public List<UrlResponse> urls(@PathVariable Long caseId,
                                  @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        return caseService.urls(caseId, user);
    }

    @GetMapping("/{caseId}/connections")
    public List<ConnectionResponse> connections(@PathVariable Long caseId,
                                                @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        return connectionService.list(caseId, user);
    }

    @PostMapping("/{caseId}/connections")
    public List<ConnectionResponse> refreshConnections(@PathVariable Long caseId,
                                                       @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        return connectionService.list(caseId, user);
    }

    @GetMapping("/{caseId}/checklist")
    public List<ChecklistItemResponse> checklist(@PathVariable Long caseId,
                                                 @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        return caseService.checklist(caseId, user);
    }

    @GetMapping("/{caseId}/report-drafts")
    public List<ReportDraftResponse> drafts(@PathVariable Long caseId,
                                            @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        return draftService.listForCase(caseId, user);
    }

    @GetMapping("/{caseId}/summary")
    public ResponseEntity<String> summary(@PathVariable Long caseId,
                                          @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        CaseResponse info = caseService.get(caseId, user);
        String text = caseService.summaryText(caseId, user);
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename("SHEild-case-" + info.reference() + ".txt", StandardCharsets.UTF_8).build();
        return ResponseEntity.ok()
                .contentType(new MediaType(MediaType.TEXT_PLAIN, StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(text);
    }
}
