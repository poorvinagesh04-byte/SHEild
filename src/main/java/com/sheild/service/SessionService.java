package com.sheild.service;

import com.sheild.dto.SessionResponse;
import com.sheild.entity.UserEntity;
import com.sheild.repository.UserRepository;
import com.sheild.security.TokenService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SessionService {

    private final UserRepository userRepository;
    private final TokenService tokenService;

    public SessionService(UserRepository userRepository, TokenService tokenService) {
        this.userRepository = userRepository;
        this.tokenService = tokenService;
    }

    @Transactional
    public SessionResponse create(String displayName) {
        String clean = sanitizeName(displayName);
        String token = tokenService.newToken();
        UserEntity user = new UserEntity(tokenService.hash(token), clean);
        userRepository.save(user);
        return new SessionResponse(token, user.getId(), user.getDisplayName(), user.getCreatedAt());
    }

    public SessionResponse info(UserEntity user) {
        return new SessionResponse(null, user.getId(), user.getDisplayName(), user.getCreatedAt());
    }

    private String sanitizeName(String displayName) {
        if (displayName == null) return null;
        String clean = displayName.replaceAll("[\\p{Cntrl}]", " ").replaceAll("\\s+", " ").trim();
        if (clean.isEmpty()) return null;
        return clean.length() > 80 ? clean.substring(0, 80) : clean;
    }
}
