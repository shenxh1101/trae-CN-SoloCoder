package com.company.knowledge.entity;

import com.company.knowledge.common.enums.DocumentStatus;
import com.company.knowledge.common.enums.FileType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serial;
import java.time.LocalDateTime;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "doc_document")
@EqualsAndHashCode(callSuper = true)
public class Document extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "summary", length = 1000)
    private String summary;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Lob
    @Column(name = "content_html", columnDefinition = "TEXT")
    private String contentHtml;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "file_path", length = 500)
    private String filePath;

    @Column(name = "file_size", columnDefinition = "bigint default 0")
    private Long fileSize;

    @Enumerated(EnumType.STRING)
    @Column(name = "file_type", length = 20)
    private FileType fileType;

    @Column(name = "mime_type", length = 100)
    private String mimeType;

    @Column(name = "file_hash", length = 64)
    private String fileHash;

    @Column(name = "version", columnDefinition = "int default 1")
    private Integer version;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private DocumentStatus status;

    @Column(name = "department_id")
    private Long departmentId;
    
    @Column(name = "department_name", length = 100)
    private String departmentName;
    
    @Column(name = "category_id")
    private Long categoryId;
    
    @Column(name = "category_name", length = 100)
    private String categoryName;
    
    @Column(name = "creator_id")
    private Long creatorId;
    
    @Column(name = "creator_name", length = 50)
    private String creatorName;

    @Column(name = "tags", length = 500)
    private String tags;

    @Column(name = "is_template", columnDefinition = "boolean default false")
    private Boolean isTemplate;

    @Column(name = "is_encrypted", columnDefinition = "boolean default false")
    private Boolean isEncrypted;

    @Column(name = "password", length = 100)
    private String password;

    @Column(name = "watermark_text", length = 200)
    private String watermarkText;

    @Column(name = "enable_watermark", columnDefinition = "boolean default true")
    private Boolean enableWatermark;

    @Column(name = "is_deleted", columnDefinition = "boolean default false")
    private Boolean isDeleted;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_by")
    private Long deletedBy;

    @Column(name = "is_locked", columnDefinition = "boolean default false")
    private Boolean isLocked;

    @Column(name = "locked_by")
    private Long lockedBy;

    @Column(name = "locked_at")
    private LocalDateTime lockedAt;

    @Column(name = "view_count", columnDefinition = "bigint default 0")
    private Long viewCount;

    @Column(name = "download_count", columnDefinition = "bigint default 0")
    private Long downloadCount;

    @Column(name = "like_count", columnDefinition = "int default 0")
    private Integer likeCount;

    @Column(name = "favorite_count", columnDefinition = "int default 0")
    private Integer favoriteCount;

    @Column(name = "comment_count", columnDefinition = "int default 0")
    private Integer commentCount;

    @Column(name = "pinyin", length = 200)
    private String pinyin;

    @Column(name = "first_letter", length = 100)
    private String firstLetter;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "expire_at")
    private LocalDateTime expireAt;

    @Column(name = "approval_id")
    private Long approvalId;
}
