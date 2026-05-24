package com.company.knowledge.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serial;
import java.time.LocalDate;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "st_hot_ranking")
@EqualsAndHashCode(callSuper = true)
public class HotRanking extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id", nullable = false)
    private Long documentId;

    @Column(name = "document_title", length = 200)
    private String documentTitle;

    @Column(name = "ranking_type", nullable = false, length = 50)
    private String rankingType;

    @Column(name = "ranking_date", nullable = false)
    private LocalDate rankingDate;

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

    @Column(name = "score", columnDefinition = "double default 0")
    private Double score;

    @Column(name = "rank_position", columnDefinition = "int default 0")
    private Integer rankPosition;
}
