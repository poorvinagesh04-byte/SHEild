package com.sheild.repository;

import com.sheild.entity.ChecklistItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChecklistItemRepository extends JpaRepository<ChecklistItem, Long> {

    List<ChecklistItem> findBySafetyCaseIdOrderBySortOrderAsc(Long caseId);

    @Query("select c from ChecklistItem c where c.id = :id and c.safetyCase.owner.id = :ownerId")
    Optional<ChecklistItem> findOwned(@Param("id") Long id, @Param("ownerId") Long ownerId);

    long countBySafetyCaseId(Long caseId);

    long countBySafetyCaseIdAndDoneTrue(Long caseId);
}
