package com.sheild.repository;

import com.sheild.entity.Incident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface IncidentRepository extends JpaRepository<Incident, Long> {

    @Query("select i from Incident i where i.safetyCase.id = :caseId order by coalesce(i.occurredAt, i.createdAt) desc, i.id desc")
    List<Incident> findForCase(@Param("caseId") Long caseId);

    @Query("select i from Incident i where i.id = :id and i.safetyCase.owner.id = :ownerId")
    Optional<Incident> findOwned(@Param("id") Long id, @Param("ownerId") Long ownerId);

    long countBySafetyCaseId(Long caseId);

    long countBySafetyCaseIdAndReviewStatus(Long caseId, com.sheild.domain.ReviewStatus status);
}
