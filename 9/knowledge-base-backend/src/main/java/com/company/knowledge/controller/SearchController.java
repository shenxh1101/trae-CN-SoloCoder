package com.company.knowledge.controller;

import com.company.knowledge.common.exception.Result;
import com.company.knowledge.dto.request.SearchRequest;
import com.company.knowledge.dto.response.SearchResult;
import com.company.knowledge.service.SearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name = "搜索管理", description = "全文搜索功能")
@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {
    
    private final SearchService searchService;
    
    @Operation(summary = "全文搜索", description = "支持关键词搜索、分类筛选、分页排序")
    @PostMapping
    public Result<SearchResult> search(@RequestBody SearchRequest request) {
        SearchResult result = searchService.search(request);
        return Result.success(result);
    }
    
    @Operation(summary = "快速搜索", description = "简化的搜索接口")
    @GetMapping
    public Result<SearchResult> quickSearch(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        SearchResult result = searchService.searchDocuments(keyword, page, size);
        return Result.success(result);
    }
    
    @Operation(summary = "搜索建议", description = "根据关键词获取搜索建议")
    @GetMapping("/suggest")
    public Result<String> getSuggestion(@RequestParam String keyword) {
        String suggestion = searchService.getSearchSuggestion(keyword);
        return Result.success(suggestion);
    }
    
    @Operation(summary = "同步文档索引", description = "同步单个文档到搜索索引")
    @PostMapping("/sync/{documentId}")
    public Result<Void> syncDocument(@PathVariable Long documentId) {
        searchService.syncDocument(documentId);
        return Result.success();
    }
    
    @Operation(summary = "重建索引", description = "重建所有文档的搜索索引")
    @PostMapping("/rebuild")
    public Result<Void> rebuildIndex() {
        searchService.rebuildIndex();
        return Result.success();
    }
}
