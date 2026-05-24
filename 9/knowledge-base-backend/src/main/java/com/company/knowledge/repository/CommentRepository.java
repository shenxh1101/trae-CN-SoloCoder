package com.company.knowledge.repository;

import com.company.knowledge.entity.Comment;
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
public interface CommentRepository extends JpaRepository<Comment, Long>, JpaSpecificationExecutor<Comment> {

    Page<Comment> findByDocumentIdAndParentIdIsNullAndIsDeletedFalseOrderByCreatedAtDesc(Long documentId, Pageable pageable);

    List<Comment> findByParentIdAndIsDeletedFalseOrderByCreatedAtAsc(Long parentId);

    long countByDocumentIdAndIsDeletedFalse(Long documentId);

    @Modifying
    @Query("UPDATE Comment c SET c.likeCount = c.likeCount + 1 WHERE c.id = :id")
    void incrementLikeCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Comment c SET c.replyCount = c.replyCount + 1 WHERE c.id = :id")
    void incrementReplyCount(@Param("id") Long id);
}
