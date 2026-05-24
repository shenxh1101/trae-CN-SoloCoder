package com.company.knowledge.dto.request;

import lombok.Data;

@Data
public class SearchRequest {
    private String keyword;
    private Long departmentId;
    private Long creatorId;
    private String category;
    private String status;
    private String tag;
    private String contentType;
    private String sortBy = "relevance";
    private String sortDir = "desc";
    private Integer page = 0;
    private Integer size = 20;
    private Boolean highlight = true;
}
