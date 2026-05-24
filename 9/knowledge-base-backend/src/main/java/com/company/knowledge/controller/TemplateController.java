package com.company.knowledge.controller;

import com.company.knowledge.common.annotation.OperationLog;
import com.company.knowledge.common.enums.OperationType;
import com.company.knowledge.common.exception.Result;
import com.company.knowledge.entity.DocumentTemplate;
import com.company.knowledge.service.TemplateService;
import com.company.knowledge.common.utils.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "模板管理", description = "文档模板管理")
@RestController
@RequestMapping("/api/templates")
@RequiredArgsConstructor
public class TemplateController {
    
    private final TemplateService templateService;
    
    @Operation(summary = "获取模板列表", description = "分页获取模板列表，支持分类筛选")
    @GetMapping
    public Result<Page<DocumentTemplate>> getList(
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "sortOrder", "createdAt"));
        Page<DocumentTemplate> templates = templateService.getTemplateList(category, pageable);
        return Result.success(templates);
    }
    
    @Operation(summary = "获取模板详情", description = "获取单个模板的详细信息")
    @GetMapping("/{id}")
    public Result<DocumentTemplate> getDetail(@PathVariable Long id) {
        DocumentTemplate template = templateService.getTemplateDetail(id);
        return Result.success(template);
    }
    
    @Operation(summary = "创建模板", description = "创建新的文档模板")
    @PostMapping
    @OperationLog(module = "模板管理", type = OperationType.CREATE)
    public Result<DocumentTemplate> create(@RequestBody DocumentTemplate template) {
        DocumentTemplate saved = templateService.createTemplate(template);
        return Result.success(saved);
    }
    
    @Operation(summary = "更新模板", description = "更新模板信息")
    @PutMapping("/{id}")
    @OperationLog(module = "模板管理", type = OperationType.UPDATE)
    public Result<DocumentTemplate> update(@PathVariable Long id, @RequestBody DocumentTemplate template) {
        DocumentTemplate updated = templateService.updateTemplate(id, template);
        return Result.success(updated);
    }
    
    @Operation(summary = "删除模板", description = "删除指定模板")
    @DeleteMapping("/{id}")
    @OperationLog(module = "模板管理", type = OperationType.DELETE)
    public Result<Void> delete(@PathVariable Long id) {
        templateService.deleteTemplate(id);
        return Result.success();
    }
    
    @Operation(summary = "热门模板", description = "获取使用次数最多的模板")
    @GetMapping("/popular")
    public Result<List<DocumentTemplate>> getPopular() {
        List<DocumentTemplate> templates = templateService.getPopularTemplates();
        return Result.success(templates);
    }
    
    @Operation(summary = "模板分类", description = "获取所有模板分类")
    @GetMapping("/categories")
    public Result<List<String>> getCategories() {
        List<String> categories = templateService.getCategories();
        return Result.success(categories);
    }
    
    @Operation(summary = "使用模板创建文档", description = "基于模板创建新文档")
    @PostMapping("/{id}/create-document")
    @OperationLog(module = "模板管理", type = OperationType.CREATE)
    public Result<Long> createDocument(@PathVariable Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        Long documentId = templateService.createDocumentFromTemplate(id, userId);
        return Result.success(documentId);
    }
}
