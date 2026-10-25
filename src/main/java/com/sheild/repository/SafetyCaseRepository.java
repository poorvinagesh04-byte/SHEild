package com.sheild.repository;

import com.sheild.entity.SafetyCase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SafetyCaseRepository extends JpaRepository<SafetyCase, Long> {
    List<SafetyCase> findByOwnerIdOrderByUpdatedAtDesc(Long ownerId);
    Optional<SafetyCase> findByIdAndOwnerId(Long id, Long ownerId);
    boolean existsByReference(String reference);
}
