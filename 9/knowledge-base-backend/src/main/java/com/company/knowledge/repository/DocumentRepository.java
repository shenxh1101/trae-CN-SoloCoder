package com.company.knowledge.repository;

import com.company.knowledge.common.enums.DocumentStatus;
import com.company.knowledge.entity.Document;
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
public interface DocumentRepository extends JpaRepository<Document, Long>, JpaSpecificationExecutor<Document> {

    Page<Document> findByStatusAndIsDeletedFalse(DocumentStatus status, Pageable pageable);

    Page<Document> findByCreatedByAndIsDeletedFalse(Long userId, Pageable pageable);

    List<Document> findByCategoryIdAndStatusAndIsDeletedFalse(Long categoryId, DocumentStatus status);

    @Query("SELECT d FROM Document d WHERE d.isDeleted = false AND d.status = 'APPROVED' ORDER BY d.viewCount DESC LIMIT 10")
    List<Document> findTop10ByViewCount();

    @Modifying
    @Query("UPDATE Document d SET d.viewCount = d.viewCount + 1 WHERE d.id = :id")
    void incrementViewCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Document d SET d.downloadCount = d.downloadCount + 1 WHERE d.id = :id")
    void incrementDownloadCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Document d SET d.likeCount = d.likeCount + 1 WHERE d.id = :id")
    void incrementLikeCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Document d SET d.likeCount = d.likeCount - 1 WHERE d.id = :id")
    void decrementLikeCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Document d SET d.favoriteCount = d.favoriteCount + 1 WHERE d.id = :id")
    void incrementFavoriteCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Document d SET d.favoriteCount = d.favoriteCount - 1 WHERE d.id = :id")
    void decrementFavoriteCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Document d SET d.commentCount = d.commentCount + 1 WHERE d.id = :id")
    void incrementCommentCount(@Param("id") Long id);
    
    Page<Document> findByIsDeletedFalseOrderByViewCountDesc(Pageable pageable);
    
    Page<Document> findByIsDeletedFalseOrderByUpdatedAtDesc(Pageable pageable);
    
    Page<Document> findByTitleContainingIgnoreCaseAndIsDeletedFalse(String title, Pageable pageable);
    
    Page<Document> findByPinyinContainingAndIsDeletedFalse(String pinyin, Pageable pageable);
    
    @Query("SELECT d FROM Document d WHERE d.isDeleted = false AND d.status = :status " +
           "ORDER BY d.viewCount DESC")
    Page<Document> findByIsDeletedFalseAndStatusOrderByViewCountDesc(
            @Param("status") DocumentStatus status, Pageable pageable);
    
    @Query("SELECT d FROM Document d WHERE d.isDeleted = false AND d.status = :status " +
           "ORDER BY d.updatedAt DESC")
    Page<Document> findByIsDeletedFalseAndStatusOrderByUpdatedAtDesc(
            @Param("status") DocumentStatus status, Pageable pageable);
    
    @Query("SELECT d FROM Document d WHERE d.isDeleted = false " +
           "AND (:status IS NULL OR d.status = :status) " +
           "AND (:keyword IS NULL OR LOWER(d.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(d.summary) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(d.content) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(d.pinyin) LIKE LOWER(CONCAT('%', :pinyinKeyword, '%'))) " +
           "AND (:departmentId IS NULL OR d.departmentId = :departmentId) " +
           "AND (:creatorId IS NULL OR d.creatorId = :creatorId) " +
           "AND (:tag IS NULL OR d.tags LIKE CONCAT('%', :tag, '%'))")
    Page<Document> search(
            @Param("keyword") String keyword,
            @Param("pinyinKeyword") String pinyinKeyword,
            @Param("departmentId") Long departmentId,
            @Param("creatorId") Long creatorId,
            @Param("status") DocumentStatus status,
            @Param("tag") String tag,
            Pageable pageable);
    
    @Query("SELECT d FROM Document d WHERE d.isDeleted = false " +
           "AND (:keyword IS NULL OR LOWER(d.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(d.summary) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(d.content) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND (:departmentId IS NULL OR d.departmentId = :departmentId) " +
           "AND (:creatorId IS NULL OR d.creatorId = :creatorId) " +
           "AND (:status IS NULL OR d.status = :status) " +
           "AND (:tag IS NULL OR d.tags LIKE CONCAT('%', :tag, '%'))")
    Page<Document> findByConditions(
            @Param("keyword") String keyword,
            @Param("status") DocumentStatus status,
            @Param("departmentId") Long departmentId,
            @Param("creatorId") Long creatorId,
            @Param("tag") String tag,
            Pageable pageable);
    
    Page<Document> findByCreatorId(Long creatorId, Pageable pageable);
    
    Page<Document> findByCreatorIdAndStatus(Long creatorId, DocumentStatus status, Pageable pageable);
}
