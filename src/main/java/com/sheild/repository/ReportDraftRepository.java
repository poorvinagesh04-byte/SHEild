package com.sheild.repository;

import com.sheild.entity.ReportDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReportDraftRepository extends JpaRepository<ReportDraft, Long> {

    List<ReportDraft> findBySafetyCaseIdOrderByUpdatedAtDesc(Long caseId);

    Optional<ReportDraft> findByIncidentId(Long incidentId);

    @Query("select d from ReportDraft d where d.id = :id and d.safetyCase.owner.id = :ownerId")
    Optional<ReportDraft> findOwned(@Param("id") Long id, @Param("ownerId") Long ownerId);

    @Query("select d from ReportDraft d where d.incident.id = :incidentId and d.safetyCase.owner.id = :ownerId")
    Optional<ReportDraft> findByIncidentOwned(@Param("incidentId") Long incidentId, @Param("ownerId") Long ownerId);
}
