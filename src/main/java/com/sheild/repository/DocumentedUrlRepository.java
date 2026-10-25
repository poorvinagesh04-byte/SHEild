package com.sheild.repository;

import com.sheild.entity.DocumentedUrl;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentedUrlRepository extends JpaRepository<DocumentedUrl, Long> {
    List<DocumentedUrl> findBySafetyCaseIdOrderByCreatedAtDesc(Long caseId);
    List<DocumentedUrl> findByIncidentIdOrderByCreatedAtAsc(Long incidentId);
    void deleteByIncidentId(Long incidentId);
}
