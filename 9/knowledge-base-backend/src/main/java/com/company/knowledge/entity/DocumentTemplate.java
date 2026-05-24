package com.company.knowledge.entity;

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
@Table(name = "doc_document_template")
@EqualsAndHashCode(callSuper = true)
public class DocumentTemplate extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "description", length = 1000)
    private String description;

    @Lob
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "file_path", length = 500)
    private String filePath;

    @Column(name = "file_size", columnDefinition = "bigint default 0")
    private Long fileSize;

    @Enumerated(EnumType.STRING)
    @Column(name = "file_type", length = 20)
    private FileType fileType;

    @Column(name = "category_id")
    private Long categoryId;

    @Column(name = "thumbnail", length = 500)
    private String thumbnail;

    @Column(name = "usage_count", columnDefinition = "int default 0")
    private Integer usageCount;

    @Column(name = "sort_order", columnDefinition = "int default 0")
    private Integer sortOrder;

    @Column(name = "enabled", columnDefinition = "boolean default true")
    private Boolean enabled;

    @Column(name = "is_public", columnDefinition = "boolean default true")
    private Boolean isPublic;
}
