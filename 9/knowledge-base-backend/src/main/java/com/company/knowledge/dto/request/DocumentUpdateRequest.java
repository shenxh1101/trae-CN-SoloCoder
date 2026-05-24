package com.company.knowledge.dto.request;

import lombok.Data;

@Data
public class DocumentUpdateRequest {
    private String title;
    private String summary;
    private String content;
    private String contentHtml;
    private Long categoryId;
    private String tags;
    private Boolean enableWatermark;
    private String watermarkText;
    private String changeLog;
}
