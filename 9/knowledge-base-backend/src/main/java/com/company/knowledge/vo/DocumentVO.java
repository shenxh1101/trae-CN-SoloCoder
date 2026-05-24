package com.company.knowledge.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private Long id;

    private String title;

    private String summary;

    private String content;

    private String contentHtml;

    private String fileName;

    private String filePath;

    private Long fileSize;

    private String fileType;

    private String fileSizeDisplay;

    private String status;

    private String statusDesc;

    private Integer version;

    private Long categoryId;

    private String categoryName;

    private String tags;

    private Long createdBy;

    private String creatorName;

    private String creatorAvatar;

    private Long departmentId;

    private String departmentName;

    private Long viewCount;

    private Long downloadCount;

    private Integer likeCount;

    private Integer favoriteCount;

    private Integer commentCount;

    private Boolean isLocked;

    private Long lockedBy;

    private String lockedByName;

    private LocalDateTime lockedAt;

    private Boolean isEncrypted;

    private Boolean enableWatermark;

    private Boolean isLiked;

    private Boolean isFavorited;

    private LocalDateTime publishedAt;

    private LocalDateTime expireAt;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
