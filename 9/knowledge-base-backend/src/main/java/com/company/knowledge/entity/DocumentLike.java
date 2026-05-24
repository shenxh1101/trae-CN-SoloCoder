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
@Table(name = "doc_document_like")
@EqualsAndHashCode(callSuper = true)
public class DocumentLike extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id", nullable = false)
    private Long documentId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "user_name", length = 50)
    private String userName;

    @Column(name = "uk_doc_user", length = 100)
    private String ukDocUser;

    @PrePersist
    public void prePersist() {
        this.ukDocUser = documentId + "_" + userId;
    }
}
