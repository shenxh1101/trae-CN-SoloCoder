package com.company.knowledge.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serial;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "cm_comment_mention")
@EqualsAndHashCode(callSuper = true)
public class CommentMention extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "comment_id", nullable = false)
    private Long commentId;

    @Column(name = "mentioned_user_id", nullable = false)
    private Long mentionedUserId;

    @Column(name = "mentioned_user_name", length = 50)
    private String mentionedUserName;

    @Column(name = "is_read", columnDefinition = "boolean default false")
    private Boolean isRead;

    @Column(name = "read_at")
    private java.time.LocalDateTime readAt;
}
