package com.sheild.repository;

import com.sheild.entity.Evidence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EvidenceRepository extends JpaRepository<Evidence, Long> {

    List<Evidence> findByIncidentIdOrderByUploadedAtDesc(Long incidentId);

    @Query("select e from Evidence e where e.incident.safetyCase.id = :caseId order by e.uploadedAt desc")
    List<Evidence> findForCase(@Param("caseId") Long caseId);

    @Query("select e from Evidence e where e.id = :id and e.incident.safetyCase.owner.id = :ownerId")
    Optional<Evidence> findOwned(@Param("id") Long id, @Param("ownerId") Long ownerId);

    @Query("select count(e) from Evidence e where e.incident.safetyCase.id = :caseId")
    long countForCase(@Param("caseId") Long caseId);

    @Query("select count(e) from Evidence e where e.incident.id = :incidentId")
    long countForIncident(@Param("incidentId") Long incidentId);
}
