package com.sheild.controller;

import com.sheild.dto.ChecklistItemResponse;
import com.sheild.dto.UpdateChecklistRequest;
import com.sheild.entity.UserEntity;
import com.sheild.security.AuthInterceptor;
import com.sheild.service.CaseService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/checklist")
public class ChecklistController {

    private final CaseService caseService;

    public ChecklistController(CaseService caseService) {
        this.caseService = caseService;
    }

    @PutMapping("/{itemId}")
    public ChecklistItemResponse update(@PathVariable Long itemId,
                                        @Valid @RequestBody UpdateChecklistRequest request,
                                        @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        return caseService.updateChecklist(itemId, request.done(), user);
    }
}
