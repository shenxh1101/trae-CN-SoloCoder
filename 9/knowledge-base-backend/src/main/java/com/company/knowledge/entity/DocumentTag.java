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
@Table(name = "doc_document_tag")
@EqualsAndHashCode(callSuper = true)
public class DocumentTag extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, unique = true, length = 50)
    private String name;

    @Column(name = "pinyin", length = 100)
    private String pinyin;

    @Column(name = "first_letter", length = 50)
    private String firstLetter;

    @Column(name = "color", length = 20)
    private String color;

    @Column(name = "sort_order", columnDefinition = "int default 0")
    private Integer sortOrder;

    @Column(name = "usage_count", columnDefinition = "int default 0")
    private Integer usageCount;
}
