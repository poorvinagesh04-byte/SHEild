package com.sheild.controller;

import com.sheild.dto.CreateSessionRequest;
import com.sheild.dto.SessionResponse;
import com.sheild.entity.UserEntity;
import com.sheild.security.AuthInterceptor;
import com.sheild.service.SessionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/session")
public class SessionController {

    private final SessionService sessionService;

    public SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @PostMapping
    public ResponseEntity<SessionResponse> create(@Valid @RequestBody(required = false) CreateSessionRequest request) {
        SessionResponse response = sessionService.create(request == null ? null : request.displayName());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/me")
    public SessionResponse me(@RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        return sessionService.info(user);
    }
}
