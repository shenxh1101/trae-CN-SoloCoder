package com.company.knowledge.service.impl;

import com.company.knowledge.common.enums.DocumentStatus;
import com.company.knowledge.common.utils.PinyinUtils;
import com.company.knowledge.dto.request.SearchRequest;
import com.company.knowledge.dto.response.SearchHit;
import com.company.knowledge.dto.response.SearchResult;
import com.company.knowledge.entity.Document;
import com.company.knowledge.repository.DocumentRepository;
import com.company.knowledge.service.SearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchServiceImpl implements SearchService {
    
    private final DocumentRepository documentRepository;
    private static final int FRAGMENT_SIZE = 150;
    
    @Override
    public SearchResult search(SearchRequest request) {
        long startTime = System.currentTimeMillis();
        
        String keyword = request.getKeyword();
        if (!StringUtils.hasText(keyword)) {
            return SearchResult.builder()
                    .hits(new ArrayList<>())
                    .totalElements(0)
                    .totalPages(0)
                    .page(request.getPage())
                    .size(request.getSize())
                    .keyword("")
                    .tookMs(0)
                    .build();
        }
        
        String pinyinKeyword = PinyinUtils.toPinyin(keyword);
        
        Pageable pageable;
        if ("relevance".equals(request.getSortBy())) {
            pageable = PageRequest.of(request.getPage(), request.getSize());
        } else {
            Sort sort = "asc".equalsIgnoreCase(request.getSortDir()) 
                    ? Sort.by(request.getSortBy()).ascending() 
                    : Sort.by(request.getSortBy()).descending();
            pageable = PageRequest.of(request.getPage(), request.getSize(), sort);
        }
        
        DocumentStatus status = null;
        if (request.getStatus() != null && !request.getStatus().isEmpty()) {
            try {
                status = DocumentStatus.valueOf(request.getStatus().toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid status filter: {}", request.getStatus());
            }
        }
        
        Page<Document> documentPage = documentRepository.search(
                keyword, pinyinKeyword, 
                request.getDepartmentId(), request.getCreatorId(),
                status, request.getTag(), pageable);
        
        List<SearchHit> hits = documentPage.getContent().stream()
                .map(doc -> convertToSearchHit(doc, keyword, request.getHighlight()))
                .sorted(Comparator.comparingDouble(SearchHit::getScore).reversed())
                .collect(Collectors.toList());
        
        long tookMs = System.currentTimeMillis() - startTime;
        String suggestion = getSearchSuggestion(keyword);
        
        return SearchResult.builder()
                .hits(hits)
                .totalElements(documentPage.getTotalElements())
                .totalPages(documentPage.getTotalPages())
                .page(documentPage.getNumber())
                .size(documentPage.getSize())
                .keyword(keyword)
                .pinyinKeyword(pinyinKeyword)
                .tookMs(tookMs)
                .suggestion(suggestion)
                .build();
    }
    
    @Override
    public SearchResult searchDocuments(String keyword, int page, int size) {
        SearchRequest request = new SearchRequest();
        request.setKeyword(keyword);
        request.setPage(page);
        request.setSize(size);
        return search(request);
    }
    
    @Override
    public void syncDocument(Long documentId) {
        log.info("Syncing document to search index: {}", documentId);
    }
    
    @Override
    public void removeDocument(Long documentId) {
        log.info("Removing document from search index: {}", documentId);
    }
    
    @Override
    public void rebuildIndex() {
        log.info("Rebuilding search index...");
    }
    
    @Override
    public String getSearchSuggestion(String keyword) {
        if (!StringUtils.hasText(keyword) || keyword.length() < 2) {
            return null;
        }
        
        Pageable pageable = PageRequest.of(0, 5);
        List<Document> suggestions = documentRepository.findByTitleContainingIgnoreCaseAndIsDeletedFalse(keyword, pageable).getContent();
        
        if (suggestions.isEmpty()) {
            String pinyin = PinyinUtils.toPinyin(keyword);
            suggestions = documentRepository.findByPinyinContainingAndIsDeletedFalse(pinyin, pageable).getContent();
        }
        
        if (!suggestions.isEmpty()) {
            return suggestions.get(0).getTitle();
        }
        
        return null;
    }
    
    private SearchHit convertToSearchHit(Document document, String keyword, boolean highlight) {
        float score = calculateScore(document, keyword);
        
        String title = document.getTitle();
        String summary = document.getSummary() != null ? document.getSummary() : "";
        String content = document.getContent() != null ? document.getContent() : "";
        
        String highlightTitle = highlight ? highlightText(title, keyword) : title;
        String highlightSummary = highlight ? highlightText(summary, keyword) : summary;
        String highlightContent = highlight ? getHighlightedFragment(content, keyword) : null;
        
        return SearchHit.builder()
                .id(document.getId())
                .title(title)
                .highlightTitle(highlightTitle)
                .summary(summary)
                .highlightSummary(highlightSummary)
                .highlightContent(highlightContent)
                .tags(document.getTags())
                .departmentId(document.getDepartmentId())
                .creatorId(document.getCreatorId())
                .status(document.getStatus().getCode())
                .statusName(document.getStatus().getDescription())
                .viewCount(document.getViewCount())
                .likeCount(document.getLikeCount())
                .commentCount(document.getCommentCount())
                .updatedAt(document.getUpdatedAt() != null 
                        ? document.getUpdatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) 
                        : null)
                .score(score)
                .build();
    }
    
    private float calculateScore(Document document, String keyword) {
        float score = 0.0f;
        
        String title = document.getTitle() != null ? document.getTitle().toLowerCase() : "";
        String summary = document.getSummary() != null ? document.getSummary().toLowerCase() : "";
        String content = document.getContent() != null ? document.getContent().toLowerCase() : "";
        String pinyin = document.getPinyin() != null ? document.getPinyin().toLowerCase() : "";
        String firstLetter = document.getFirstLetter() != null ? document.getFirstLetter().toLowerCase() : "";
        
        String lowerKeyword = keyword.toLowerCase();
        String pinyinKeyword = PinyinUtils.toPinyin(keyword).toLowerCase();
        String firstLetterKeyword = PinyinUtils.toFirstLetter(keyword).toLowerCase();
        
        if (title.equals(lowerKeyword)) {
            score += 100.0f;
        } else if (title.contains(lowerKeyword)) {
            score += 50.0f;
        }
        
        if (pinyin.contains(pinyinKeyword)) {
            score += 30.0f;
        }
        
        if (firstLetter.contains(firstLetterKeyword)) {
            score += 20.0f;
        }
        
        if (summary.contains(lowerKeyword)) {
            score += 15.0f;
        }
        
        if (content.contains(lowerKeyword)) {
            score += 5.0f;
        }
        
        long viewCount = document.getViewCount() != null ? document.getViewCount() : 0;
        int likeCount = document.getLikeCount() != null ? document.getLikeCount() : 0;
        
        score += (float) (Math.log10(viewCount + 1) * 2);
        score += likeCount * 0.5f;
        
        if (document.getUpdatedAt() != null) {
            long daysAgo = java.time.temporal.ChronoUnit.DAYS.between(
                    document.getUpdatedAt(), java.time.LocalDateTime.now());
            if (daysAgo <= 7) {
                score += 10.0f;
            } else if (daysAgo <= 30) {
                score += 5.0f;
            }
        }
        
        return score;
    }
    
    private String highlightText(String text, String keyword) {
        if (!StringUtils.hasText(text) || !StringUtils.hasText(keyword)) {
            return text;
        }
        
        try {
            Pattern pattern = Pattern.compile(Pattern.quote(keyword), Pattern.CASE_INSENSITIVE);
            Matcher matcher = pattern.matcher(text);
            StringBuffer sb = new StringBuffer();
            
            while (matcher.find()) {
                matcher.appendReplacement(sb, "<mark>$0</mark>");
            }
            matcher.appendTail(sb);
            
            String result = sb.toString();
            
            String pinyinKeyword = PinyinUtils.toPinyin(keyword);
            if (!keyword.equals(pinyinKeyword)) {
                Pattern pinyinPattern = Pattern.compile(Pattern.quote(pinyinKeyword), Pattern.CASE_INSENSITIVE);
                Matcher pinyinMatcher = pinyinPattern.matcher(result);
                sb = new StringBuffer();
                while (pinyinMatcher.find()) {
                    pinyinMatcher.appendReplacement(sb, "<mark>$0</mark>");
                }
                pinyinMatcher.appendTail(sb);
                result = sb.toString();
            }
            
            return result;
        } catch (Exception e) {
            log.warn("Failed to highlight text", e);
            return text;
        }
    }
    
    private String getHighlightedFragment(String content, String keyword) {
        if (!StringUtils.hasText(content) || !StringUtils.hasText(keyword)) {
            return null;
        }
        
        String lowerContent = content.toLowerCase();
        String lowerKeyword = keyword.toLowerCase();
        
        int index = lowerContent.indexOf(lowerKeyword);
        if (index == -1) {
            String pinyin = PinyinUtils.toPinyin(content).toLowerCase();
            String pinyinKeyword = PinyinUtils.toPinyin(keyword).toLowerCase();
            index = pinyin.indexOf(pinyinKeyword);
        }
        
        if (index == -1) {
            return content.length() > FRAGMENT_SIZE ? content.substring(0, FRAGMENT_SIZE) + "..." : content;
        }
        
        int start = Math.max(0, index - FRAGMENT_SIZE / 2);
        int end = Math.min(content.length(), start + FRAGMENT_SIZE);
        start = Math.max(0, end - FRAGMENT_SIZE);
        
        String fragment = content.substring(start, end);
        
        if (start > 0) {
            fragment = "..." + fragment;
        }
        if (end < content.length()) {
            fragment = fragment + "...";
        }
        
        return highlightText(fragment, keyword);
    }
}
