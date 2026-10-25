package com.sheild.controller;

import com.sheild.dto.SupportRequest;
import com.sheild.dto.SupportResponse;
import com.sheild.entity.UserEntity;
import com.sheild.security.AuthInterceptor;
import com.sheild.service.SupportService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/support")
public class SupportController {

    private final SupportService supportService;

    public SupportController(SupportService supportService) {
        this.supportService = supportService;
    }

    @PostMapping("/respond")
    public SupportResponse respond(@Valid @RequestBody SupportRequest request,
                                   @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        return supportService.respond(request, user);
    }
}
