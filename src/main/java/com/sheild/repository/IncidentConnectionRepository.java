package com.sheild.repository;

import com.sheild.entity.IncidentConnection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface IncidentConnectionRepository extends JpaRepository<IncidentConnection, Long> {

    List<IncidentConnection> findBySafetyCaseIdOrderByCreatedAtDesc(Long caseId);

    @Query("select c from IncidentConnection c where c.id = :id and c.safetyCase.owner.id = :ownerId")
    Optional<IncidentConnection> findOwned(@Param("id") Long id, @Param("ownerId") Long ownerId);

    boolean existsBySafetyCaseIdAndIncidentAIdAndIncidentBId(Long caseId, Long incidentAId, Long incidentBId);
}
