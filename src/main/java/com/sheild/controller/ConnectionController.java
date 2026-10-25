package com.sheild.controller;

import com.sheild.dto.ConnectionResponse;
import com.sheild.dto.UpdateConnectionRequest;
import com.sheild.entity.UserEntity;
import com.sheild.security.AuthInterceptor;
import com.sheild.service.ConnectionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/connections")
public class ConnectionController {

    private final ConnectionService connectionService;

    public ConnectionController(ConnectionService connectionService) {
        this.connectionService = connectionService;
    }

    @PutMapping("/{connectionId}")
    public ConnectionResponse update(@PathVariable Long connectionId,
                                     @Valid @RequestBody UpdateConnectionRequest request,
                                     @RequestAttribute(AuthInterceptor.CURRENT_USER) UserEntity user) {
        return connectionService.decide(connectionId, request.status().name(), user);
    }
}
