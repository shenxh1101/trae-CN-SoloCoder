package com.company.knowledge.controller;

import com.company.knowledge.common.annotation.OperationLog;
import com.company.knowledge.common.enums.DocumentStatus;
import com.company.knowledge.common.enums.OperationType;
import com.company.knowledge.common.exception.Result;
import com.company.knowledge.dto.request.DocumentCreateRequest;
import com.company.knowledge.dto.request.DocumentUpdateRequest;
import com.company.knowledge.entity.Document;
import com.company.knowledge.entity.DocumentVersion;
import com.company.knowledge.entity.User;
import com.company.knowledge.service.DocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@Tag(name = "文档管理", description = "文档CRUD操作")
@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @Operation(summary = "获取文档列表", description = "分页获取文档列表，支持筛选")
    @GetMapping
    public Result<Page<Document>> list(
            @Parameter(description = "页码") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "每页数量") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "关键词搜索") @RequestParam(required = false) String keyword,
            @Parameter(description = "文档状态") @RequestParam(required = false) DocumentStatus status,
            @Parameter(description = "部门ID") @RequestParam(required = false) Long departmentId,
            @Parameter(description = "创建者ID") @RequestParam(required = false) Long creatorId,
            @Parameter(description = "标签") @RequestParam(required = false) String tag,
            @Parameter(description = "排序字段") @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "排序方向") @RequestParam(defaultValue = "desc") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("asc") ?
                Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Document> documents = documentService.listDocuments(
                keyword, status, departmentId, creatorId, tag, pageable);
        return Result.success(documents);
    }

    @Operation(summary = "获取文档详情", description = "根据ID获取文档详情，自动增加浏览量")
    @GetMapping("/{id}")
    public Result<Document> getById(@PathVariable Long id) {
        Document document = documentService.getDocumentById(id);
        return Result.success(document);
    }

    @Operation(summary = "获取我创建的文档", description = "获取当前用户创建的文档列表")
    @GetMapping("/my")
    public Result<Page<Document>> getMyDocuments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) DocumentStatus status) {

        Pageable pageable = PageRequest.of(page, size);
        Page<Document> documents = documentService.getMyDocuments(status, pageable);
        return Result.success(documents);
    }

    @Operation(summary = "获取我的收藏", description = "获取当前用户收藏的文档列表")
    @GetMapping("/favorites")
    public Result<Page<Document>> getMyFavorites(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<Document> documents = documentService.getMyFavorites(pageable);
        return Result.success(documents);
    }

    @Operation(summary = "创建文档", description = "创建新文档")
    @PostMapping
    @OperationLog(module = "文档管理", type = OperationType.CREATE)
    public Result<Document> create(@RequestBody DocumentCreateRequest request) {
        Document document = documentService.createDocument(request);
        return Result.success(document);
    }

    @Operation(summary = "更新文档", description = "更新文档内容，自动创建新版本")
    @PutMapping("/{id}")
    @OperationLog(module = "文档管理", type = OperationType.UPDATE)
    public Result<Document> update(
            @PathVariable Long id,
            @RequestBody DocumentUpdateRequest request) {
        Document document = documentService.updateDocument(id, request);
        return Result.success(document);
    }

    @Operation(summary = "删除文档", description = "软删除文档到回收站")
    @DeleteMapping("/{id}")
    @OperationLog(module = "文档管理", type = OperationType.DELETE)
    public Result<Void> delete(@PathVariable Long id) {
        documentService.deleteDocument(id);
        return Result.success();
    }

    @Operation(summary = "发布文档", description = "将文档状态改为已发布")
    @PostMapping("/{id}/publish")
    @OperationLog(module = "文档管理", type = OperationType.PUBLISH)
    public Result<Document> publish(@PathVariable Long id) {
        Document document = documentService.publishDocument(id);
        return Result.success(document);
    }

    @Operation(summary = "获取版本历史", description = "获取文档的版本列表")
    @GetMapping("/{id}/versions")
    public Result<List<DocumentVersion>> getVersions(@PathVariable Long id) {
        List<DocumentVersion> versions = documentService.getDocumentVersions(id);
        return Result.success(versions);
    }

    @Operation(summary = "获取指定版本", description = "获取文档的指定版本详情")
    @GetMapping("/{id}/versions/{versionId}")
    public Result<DocumentVersion> getVersion(
            @PathVariable Long id,
            @PathVariable Long versionId) {
        DocumentVersion version = documentService.getDocumentVersion(id, versionId);
        return Result.success(version);
    }

    @Operation(summary = "回滚版本", description = "将文档回滚到指定版本")
    @PostMapping("/{id}/versions/{versionId}/rollback")
    @OperationLog(module = "文档管理", type = OperationType.ROLLBACK)
    public Result<Document> rollback(
            @PathVariable Long id,
            @PathVariable Long versionId) {
        Document document = documentService.rollbackToVersion(id, versionId);
        return Result.success(document);
    }

    @Operation(summary = "获取文档链接", description = "获取文档的正向链接列表")
    @GetMapping("/{id}/links")
    public Result<List<Map<String, Object>>> getLinks(@PathVariable Long id) {
        List<Map<String, Object>> links = documentService.getDocumentLinks(id);
        return Result.success(links);
    }

    @Operation(summary = "获取反向链接", description = "获取引用当前文档的其他文档")
    @GetMapping("/{id}/backlinks")
    public Result<List<Document>> getBacklinks(@PathVariable Long id) {
        List<Document> backlinks = documentService.getBacklinks(id);
        return Result.success(backlinks);
    }

    @Operation(summary = "点赞文档", description = "点赞或取消点赞文档")
    @PostMapping("/{id}/like")
    public Result<Map<String, Object>> like(@PathVariable Long id) {
        Map<String, Object> result = documentService.toggleLike(id);
        return Result.success(result);
    }

    @Operation(summary = "收藏文档", description = "收藏或取消收藏文档")
    @PostMapping("/{id}/favorite")
    public Result<Map<String, Object>> favorite(@PathVariable Long id) {
        Map<String, Object> result = documentService.toggleFavorite(id);
        return Result.success(result);
    }

    @Operation(summary = "上传图片", description = "上传图片到文档")
    @PostMapping("/upload-image")
    public Result<String> uploadImage(@RequestParam("file") MultipartFile file) {
        String imageUrl = documentService.uploadImage(file);
        return Result.success(imageUrl);
    }

    @Operation(summary = "保存Base64图片", description = "保存富文本编辑器粘贴的图片")
    @PostMapping("/save-base64-image")
    public Result<String> saveBase64Image(@RequestBody Map<String, String> request) {
        String base64Data = request.get("data");
        String imageUrl = documentService.saveBase64Image(base64Data);
        return Result.success(imageUrl);
    }

    @Operation(summary = "批量删除", description = "批量删除文档到回收站")
    @DeleteMapping("/batch")
    @OperationLog(module = "文档管理", type = OperationType.BATCH_DELETE)
    public Result<Void> batchDelete(@RequestBody List<Long> ids) {
        documentService.batchDeleteDocuments(ids);
        return Result.success();
    }

    @Operation(summary = "批量更新状态", description = "批量更新文档状态")
    @PutMapping("/batch/status")
    @OperationLog(module = "文档管理", type = OperationType.BATCH_UPDATE)
    public Result<Void> batchUpdateStatus(
            @RequestBody Map<String, Object> request) {
        List<Long> ids = (List<Long>) request.get("ids");
        DocumentStatus status = DocumentStatus.valueOf((String) request.get("status"));
        documentService.batchUpdateStatus(ids, status);
        return Result.success();
    }

    @Operation(summary = "获取热门文档", description = "获取热门文档列表")
    @GetMapping("/popular")
    public Result<Page<Document>> getPopularDocuments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Document> documents = documentService.getPopularDocuments(pageable);
        return Result.success(documents);
    }

    @Operation(summary = "获取最近文档", description = "获取最近更新的文档")
    @GetMapping("/recent")
    public Result<Page<Document>> getRecentDocuments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Document> documents = documentService.getRecentDocuments(pageable);
        return Result.success(documents);
    }
}
