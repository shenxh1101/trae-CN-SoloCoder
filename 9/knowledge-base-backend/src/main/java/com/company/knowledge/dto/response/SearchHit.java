package com.company.knowledge.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchHit {
    private Long id;
    private String title;
    private String highlightTitle;
    private String summary;
    private String highlightSummary;
    private String highlightContent;
    private String tags;
    private Long departmentId;
    private String departmentName;
    private Long creatorId;
    private String creatorName;
    private String status;
    private String statusName;
    private Long viewCount;
    private Integer likeCount;
    private Integer commentCount;
    private String updatedAt;
    private float score;
}
