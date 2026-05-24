package com.company.knowledge.dto.request;

import lombok.Data;

@Data
public class DocumentCreateRequest {
    private String title;
    private String summary;
    private String content;
    private String contentHtml;
    private Long departmentId;
    private Long categoryId;
    private String tags;
    private Boolean enableWatermark;
    private String watermarkText;
}
