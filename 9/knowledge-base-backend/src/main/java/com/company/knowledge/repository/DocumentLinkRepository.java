package com.company.knowledge.repository;

import com.company.knowledge.entity.DocumentLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentLinkRepository extends JpaRepository<DocumentLink, Long>, JpaSpecificationExecutor<DocumentLink> {

    List<DocumentLink> findBySourceDocumentId(Long sourceDocumentId);

    List<DocumentLink> findByTargetDocumentId(Long targetDocumentId);

    void deleteBySourceDocumentId(Long sourceDocumentId);

    void deleteBySourceDocumentIdOrTargetDocumentId(Long sourceDocumentId, Long targetDocumentId);
}
