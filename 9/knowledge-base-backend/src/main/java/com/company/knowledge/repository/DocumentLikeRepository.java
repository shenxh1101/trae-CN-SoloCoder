package com.company.knowledge.repository;

import com.company.knowledge.entity.DocumentLike;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DocumentLikeRepository extends JpaRepository<DocumentLike, Long>, JpaSpecificationExecutor<DocumentLike> {

    Optional<DocumentLike> findByDocumentIdAndUserId(Long documentId, Long userId);

    Page<DocumentLike> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    boolean existsByDocumentIdAndUserId(Long documentId, Long userId);

    long countByDocumentId(Long documentId);

    void deleteByDocumentIdAndUserId(Long documentId, Long userId);
}
