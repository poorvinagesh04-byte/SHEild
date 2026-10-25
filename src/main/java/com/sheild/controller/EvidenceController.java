package com.sheild.controller;

import com.sheild.dto.EvidenceResponse;
import com.sheild.entity.UserEntity;
import com.sheild.security.AuthInterceptor;
import com.sheild.service.EvidenceService;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/evidence")
public class EvidenceController {

    private final EvidenceService evidenceService;

    public EvidenceController(EvidenceService evidenceService) {
        this.evidenceService = evidenceService;
    }

    @GetMapping("/{evidenceId}")
    public EvidenceResponse get(@PathVariable Long evidenceId,
                                @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        return evidenceService.get(evidenceId, user);
    }

    @GetMapping("/{evidenceId}/file")
    public ResponseEntity<Resource> file(@PathVariable Long evidenceId,
                                         @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        EvidenceService.DownloadedEvidence downloaded = evidenceService.download(evidenceId, user);
        ContentDisposition disposition = (downloaded.inline()
                ? ContentDisposition.inline()
                : ContentDisposition.attachment())
                .filename(downloaded.filename(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(downloaded.mimeType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .header("X-Content-Type-Options", "nosniff")
                .body(downloaded.resource());
    }

    @DeleteMapping("/{evidenceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long evidenceId,
                       @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        evidenceService.delete(evidenceId, user);
    }
}
