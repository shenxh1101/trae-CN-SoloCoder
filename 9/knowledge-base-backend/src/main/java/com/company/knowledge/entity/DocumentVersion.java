package com.company.knowledge.entity;

import com.company.knowledge.common.enums.DocumentStatus;
import com.company.knowledge.common.enums.FileType;
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
@Table(name = "doc_document_version")
@EqualsAndHashCode(callSuper = true)
public class DocumentVersion extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id", nullable = false)
    private Long documentId;

    @Column(name = "version", nullable = false, columnDefinition = "int default 1")
    private Integer version;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "summary", length = 1000)
    private String summary;

    @Lob
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

    @Column(name = "file_hash", length = 64)
    private String fileHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private DocumentStatus status;

    @Column(name = "change_log", length = 1000)
    private String changeLog;

    @Column(name = "is_major", columnDefinition = "boolean default false")
    private Boolean isMajor;

    @Column(name = "creator_id")
    private Long creatorId;
}
