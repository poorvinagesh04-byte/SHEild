package com.sheild.controller;

import com.sheild.dto.ConfirmSummaryRequest;
import com.sheild.dto.EvidenceResponse;
import com.sheild.dto.IncidentRequest;
import com.sheild.dto.IncidentResponse;
import com.sheild.dto.ReviewResponse;
import com.sheild.entity.UserEntity;
import com.sheild.security.AuthInterceptor;
import com.sheild.service.EvidenceService;
import com.sheild.service.IncidentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api")
public class IncidentController {

    private final IncidentService incidentService;
    private final EvidenceService evidenceService;

    public IncidentController(IncidentService incidentService, EvidenceService evidenceService) {
        this.incidentService = incidentService;
        this.evidenceService = evidenceService;
    }

    @GetMapping("/incidents/{incidentId}")
    public IncidentResponse get(@PathVariable Long incidentId,
                                @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        return incidentService.get(incidentId, user);
    }

    @PutMapping("/incidents/{incidentId}")
    public IncidentResponse update(@PathVariable Long incidentId, @Valid @RequestBody IncidentRequest request,
                                   @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        return incidentService.update(incidentId, request, user);
    }

    @PostMapping("/incidents/{incidentId}/review")
    public ReviewResponse review(@PathVariable Long incidentId,
                                 @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        return incidentService.generateReview(incidentId, user);
    }

    @PutMapping("/incidents/{incidentId}/confirmed-summary")
    public IncidentResponse confirm(@PathVariable Long incidentId,
                                    @Valid @RequestBody ConfirmSummaryRequest request,
                                    @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        return incidentService.confirmSummary(incidentId, request.summary(), user);
    }

    @PostMapping("/incidents/{incidentId}/evidence")
    public ResponseEntity<EvidenceResponse> upload(@PathVariable Long incidentId,
                                                   @RequestPart("file") MultipartFile file,
                                                   @RequestParam(value = "note", required = false) String note,
                                                   @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        EvidenceResponse response = evidenceService.upload(incidentId, file, note, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/incidents/{incidentId}/evidence")
    public List<EvidenceResponse> evidence(@PathVariable Long incidentId,
                                           @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        return evidenceService.listForIncident(incidentId, user);
    }
}
