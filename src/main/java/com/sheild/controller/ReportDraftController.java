package com.sheild.controller;

import com.sheild.dto.ReportDraftResponse;
import com.sheild.dto.UpdateDraftRequest;
import com.sheild.entity.UserEntity;
import com.sheild.security.AuthInterceptor;
import com.sheild.service.ReportDraftService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ReportDraftController {

    private final ReportDraftService draftService;

    public ReportDraftController(ReportDraftService draftService) {
        this.draftService = draftService;
    }

    @PostMapping("/incidents/{incidentId}/report-drafts")
    public ResponseEntity<ReportDraftResponse> generate(@PathVariable Long incidentId,
                                                        @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(draftService.generate(incidentId, user));
    }

    @PutMapping("/report-drafts/{draftId}")
    public ReportDraftResponse update(@PathVariable Long draftId,
                                      @Valid @RequestBody UpdateDraftRequest request,
                                      @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        return draftService.update(draftId, request, user);
    }
}
