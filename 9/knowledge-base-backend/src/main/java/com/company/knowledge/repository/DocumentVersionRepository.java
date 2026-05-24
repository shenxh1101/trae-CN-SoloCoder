package com.company.knowledge.repository;

import com.company.knowledge.entity.DocumentVersion;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, Long>, JpaSpecificationExecutor<DocumentVersion> {

    List<DocumentVersion> findByDocumentIdOrderByVersionDesc(Long documentId);

    Optional<DocumentVersion> findByDocumentIdAndVersion(Long documentId, Integer version);

    @Query("SELECT MAX(dv.version) FROM DocumentVersion dv WHERE dv.documentId = :documentId")
    Integer findMaxVersionByDocumentId(@Param("documentId") Long documentId);

    void deleteByDocumentId(Long documentId);
}
