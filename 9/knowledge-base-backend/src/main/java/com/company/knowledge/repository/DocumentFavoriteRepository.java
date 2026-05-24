package com.company.knowledge.repository;

import com.company.knowledge.entity.DocumentFavorite;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentFavoriteRepository extends JpaRepository<DocumentFavorite, Long>, JpaSpecificationExecutor<DocumentFavorite> {

    Optional<DocumentFavorite> findByDocumentIdAndUserId(Long documentId, Long userId);

    Page<DocumentFavorite> findByUserId(Long userId, Pageable pageable);

    Page<DocumentFavorite> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<DocumentFavorite> findByUserIdAndFolderIdOrderByCreatedAtDesc(Long userId, Long folderId);

    boolean existsByDocumentIdAndUserId(Long documentId, Long userId);

    long countByDocumentId(Long documentId);

    void deleteByDocumentIdAndUserId(Long documentId, Long userId);
}
