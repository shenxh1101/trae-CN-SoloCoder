package com.company.knowledge.repository;

import com.company.knowledge.entity.DocumentTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentTemplateRepository extends JpaRepository<DocumentTemplate, Long>, JpaSpecificationExecutor<DocumentTemplate> {

    Page<DocumentTemplate> findByEnabledTrue(Pageable pageable);

    List<DocumentTemplate> findByCategoryIdAndEnabledTrue(Long categoryId);

    List<DocumentTemplate> findTop10ByEnabledTrueOrderByUsageCountDesc();

    @Modifying
    @Query("UPDATE DocumentTemplate dt SET dt.usageCount = dt.usageCount + 1 WHERE dt.id = :id")
    void incrementUsageCount(@Param("id") Long id);
}
