package com.company.knowledge.repository;

import com.company.knowledge.entity.CommentMention;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CommentMentionRepository extends JpaRepository<CommentMention, Long>, JpaSpecificationExecutor<CommentMention> {

    Page<CommentMention> findByMentionedUserIdOrderByCreatedAtDesc(Long mentionedUserId, Pageable pageable);

    long countByMentionedUserIdAndIsReadFalse(Long mentionedUserId);

    @Modifying
    @Query("UPDATE CommentMention cm SET cm.isRead = true, cm.readAt = CURRENT_TIMESTAMP WHERE cm.mentionedUserId = :userId")
    void markAllAsRead(@Param("userId") Long userId);
}
