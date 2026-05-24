package com.company.knowledge.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchResult {
    private List<SearchHit> hits;
    private long totalElements;
    private int totalPages;
    private int page;
    private int size;
    private String keyword;
    private String pinyinKeyword;
    private long tookMs;
    private String suggestion;
}
