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
@Table(name = "doc_document_link")
@EqualsAndHashCode(callSuper = true)
public class DocumentLink extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_document_id", nullable = false)
    private Long sourceDocumentId;

    @Column(name = "target_document_id", nullable = false)
    private Long targetDocumentId;

    @Column(name = "link_type", length = 50)
    private String linkType;

    @Column(name = "description", length = 500)
    private String description;
}
