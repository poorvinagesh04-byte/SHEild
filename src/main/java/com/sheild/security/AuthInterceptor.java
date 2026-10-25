package com.sheild.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sheild.entity.UserEntity;
import com.sheild.repository.UserRepository;
import com.sheild.web.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import com.sheild.service.AccessService;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    public static final String CURRENT_USER = "currentUser";

    private final UserRepository userRepository;
    private final TokenService tokenService;
    private final AccessService accessService;
    private final ObjectMapper objectMapper;

    public AuthInterceptor(UserRepository userRepository, TokenService tokenService,
                           AccessService accessService, ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.tokenService = tokenService;
        this.accessService = accessService;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            writeUnauthorized(request, response, "An access token is required to open this case.");
            return false;
        }
        String token = header.substring(7).trim();
        if (token.isEmpty() || token.length() > 200) {
            writeUnauthorized(request, response, "Your access token is not valid. Start a new session to continue.");
            return false;
        }
        UserEntity user = userRepository.findByAccessTokenHash(tokenService.hash(token)).orElse(null);
        if (user == null) {
            writeUnauthorized(request, response, "Your access session has expired or is not recognised on this device.");
            return false;
        }
        if (user.getLastSeenAt() == null || Duration.between(user.getLastSeenAt(), Instant.now()).toMinutes() >= 5) {
            user.touch();
            userRepository.save(user);
        }
        request.setAttribute(CURRENT_USER, user);
        return true;
    }

    private void writeUnauthorized(HttpServletRequest request, HttpServletResponse response, String message)
            throws Exception {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        ApiErrorResponse body = new ApiErrorResponse(Instant.now(), 401, "Unauthorized", message,
                request.getRequestURI(), null);
        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
