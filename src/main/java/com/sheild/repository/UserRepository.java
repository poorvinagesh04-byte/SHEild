package com.sheild.repository;

import com.sheild.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByAccessTokenHash(String accessTokenHash);
}
