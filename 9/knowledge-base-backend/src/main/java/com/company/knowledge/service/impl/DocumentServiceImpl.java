package com.company.knowledge.service.impl;

import com.company.knowledge.common.enums.DocumentStatus;
import com.company.knowledge.common.enums.ResultCode;
import com.company.knowledge.common.exception.BusinessException;
import com.company.knowledge.common.utils.PinyinUtils;
import com.company.knowledge.common.utils.SecurityUtils;
import com.company.knowledge.dto.request.DocumentCreateRequest;
import com.company.knowledge.dto.request.DocumentUpdateRequest;
import com.company.knowledge.entity.*;
import com.company.knowledge.repository.*;
import com.company.knowledge.service.DocumentService;
import com.company.knowledge.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentServiceImpl implements DocumentService {

    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository documentVersionRepository;
    private final DocumentLikeRepository documentLikeRepository;
    private final DocumentFavoriteRepository documentFavoriteRepository;
    private final DocumentLinkRepository documentLinkRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    private static final Pattern WIKI_LINK_PATTERN = Pattern.compile("\\[\\[(\\d+):([^\\]]+)\\]\\]");

    @Override
    public Page<Document> listDocuments(String keyword, DocumentStatus status, Long departmentId,
                                         Long creatorId, String tag, Pageable pageable) {
        return documentRepository.findByConditions(keyword, status, departmentId, creatorId, tag, pageable);
    }

    @Override
    @Transactional
    public Document getDocumentById(Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ResultCode.NOT_FOUND, "文档不存在"));

        if (Boolean.TRUE.equals(document.getIsDeleted())) {
            throw new BusinessException(ResultCode.NOT_FOUND, "文档已被删除");
        }

        return document;
    }

    @Override
    public Page<Document> getMyDocuments(DocumentStatus status, Pageable pageable) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (status != null) {
            return documentRepository.findByCreatorIdAndStatus(userId, status, pageable);
        }
        return documentRepository.findByCreatorId(userId, pageable);
    }

    @Override
    public Page<Document> getMyFavorites(Pageable pageable) {
        Long userId = SecurityUtils.getCurrentUserId();
        Page<DocumentFavorite> favorites = documentFavoriteRepository.findByUserId(userId, pageable);
        List<Long> documentIds = favorites.getContent().stream()
                .map(DocumentFavorite::getDocumentId)
                .collect(Collectors.toList());

        if (documentIds.isEmpty()) {
            return Page.empty(pageable);
        }

        List<Document> documents = documentRepository.findAllById(documentIds);
        return new org.springframework.data.domain.PageImpl<>(documents, pageable, favorites.getTotalElements());
    }

    @Override
    @Transactional
    public Document createDocument(DocumentCreateRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        User creator = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ResultCode.NOT_FOUND, "用户不存在"));

        Document document = new Document();
        document.setTitle(request.getTitle());
        document.setSummary(request.getSummary());
        document.setContent(request.getContent());
        document.setContentHtml(request.getContentHtml());
        document.setDepartmentId(request.getDepartmentId());
        document.setCategoryId(request.getCategoryId());
        document.setTags(request.getTags());
        document.setStatus(DocumentStatus.DRAFT);
        document.setVersion(1);
        document.setCreatorId(userId);
        document.setIsDeleted(false);
        document.setIsTemplate(false);
        document.setEnableWatermark(request.getEnableWatermark() != null ? request.getEnableWatermark() : true);
        document.setWatermarkText(request.getWatermarkText());

        if (request.getTitle() != null) {
            document.setPinyin(PinyinUtils.toPinyin(request.getTitle()));
            document.setFirstLetter(PinyinUtils.toFirstLetter(request.getTitle()));
        }

        document = documentRepository.save(document);

        createVersion(document, "初始版本");

        parseAndSaveLinks(document);

        return document;
    }

    @Override
    @Transactional
    public Document updateDocument(Long id, DocumentUpdateRequest request) {
        Document document = getDocumentById(id);

        if (!document.getCreatorId().equals(SecurityUtils.getCurrentUserId())) {
            throw new BusinessException(ResultCode.FORBIDDEN, "只有文档创建者才能编辑文档");
        }

        if (document.getStatus() == DocumentStatus.PENDING) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "文档正在审批中，无法编辑");
        }

        if (request.getTitle() != null) {
            document.setTitle(request.getTitle());
            document.setPinyin(PinyinUtils.toPinyin(request.getTitle()));
            document.setFirstLetter(PinyinUtils.toFirstLetter(request.getTitle()));
        }

        document.setSummary(request.getSummary());
        document.setContent(request.getContent());
        document.setContentHtml(request.getContentHtml());
        document.setCategoryId(request.getCategoryId());
        document.setTags(request.getTags());

        if (request.getEnableWatermark() != null) {
            document.setEnableWatermark(request.getEnableWatermark());
        }
        if (request.getWatermarkText() != null) {
            document.setWatermarkText(request.getWatermarkText());
        }

        document.setVersion(document.getVersion() + 1);

        document = documentRepository.save(document);

        String changeLog = request.getChangeLog() != null ? request.getChangeLog() : "更新文档";
        createVersion(document, changeLog);

        parseAndSaveLinks(document);

        return document;
    }

    @Override
    @Transactional
    public void deleteDocument(Long id) {
        Document document = getDocumentById(id);
        Long userId = SecurityUtils.getCurrentUserId();

        document.setIsDeleted(true);
        document.setDeletedAt(LocalDateTime.now());
        document.setDeletedBy(userId);

        documentRepository.save(document);
    }

    @Override
    @Transactional
    public Document publishDocument(Long id) {
        Document document = getDocumentById(id);
        document.setStatus(DocumentStatus.APPROVED);
        document.setPublishedAt(LocalDateTime.now());
        return documentRepository.save(document);
    }

    @Override
    public List<DocumentVersion> getDocumentVersions(Long documentId) {
        return documentVersionRepository.findByDocumentIdOrderByVersionDesc(documentId);
    }

    @Override
    public DocumentVersion getDocumentVersion(Long documentId, Long versionId) {
        DocumentVersion version = documentVersionRepository.findById(versionId)
                .orElseThrow(() -> new BusinessException(ResultCode.NOT_FOUND, "版本不存在"));

        if (!version.getDocumentId().equals(documentId)) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "版本与文档不匹配");
        }

        return version;
    }

    @Override
    @Transactional
    public Document rollbackToVersion(Long documentId, Long versionId) {
        Document document = getDocumentById(documentId);
        DocumentVersion version = getDocumentVersion(documentId, versionId);

        document.setTitle(version.getTitle());
        document.setContent(version.getContent());
        document.setContentHtml(version.getContentHtml());
        document.setVersion(document.getVersion() + 1);

        document = documentRepository.save(document);

        createVersion(document, "回滚到版本 " + version.getVersion());

        parseAndSaveLinks(document);

        return document;
    }

    @Override
    public List<Map<String, Object>> getDocumentLinks(Long documentId) {
        List<DocumentLink> links = documentLinkRepository.findBySourceDocumentId(documentId);

        return links.stream().map(link -> {
            Map<String, Object> linkInfo = new HashMap<>();
            linkInfo.put("id", link.getId());
            linkInfo.put("targetId", link.getTargetDocumentId());

            Document target = documentRepository.findById(link.getTargetDocumentId()).orElse(null);
            if (target != null) {
                linkInfo.put("targetTitle", target.getTitle());
                linkInfo.put("targetStatus", target.getStatus());
            }

            return linkInfo;
        }).collect(Collectors.toList());
    }

    @Override
    public List<Document> getBacklinks(Long documentId) {
        List<DocumentLink> links = documentLinkRepository.findByTargetDocumentId(documentId);
        List<Long> sourceIds = links.stream()
                .map(DocumentLink::getSourceDocumentId)
                .collect(Collectors.toList());

        if (sourceIds.isEmpty()) {
            return Collections.emptyList();
        }

        return documentRepository.findAllById(sourceIds);
    }

    @Override
    @Transactional
    public Map<String, Object> toggleLike(Long documentId) {
        Long userId = SecurityUtils.getCurrentUserId();
        Document document = getDocumentById(documentId);

        Optional<DocumentLike> existingLike = documentLikeRepository
                .findByDocumentIdAndUserId(documentId, userId);

        boolean liked;
        if (existingLike.isPresent()) {
            documentLikeRepository.delete(existingLike.get());
            document.setLikeCount(document.getLikeCount() - 1);
            liked = false;
        } else {
            DocumentLike like = new DocumentLike();
            like.setDocumentId(documentId);
            like.setUserId(userId);
            documentLikeRepository.save(like);
            document.setLikeCount(document.getLikeCount() + 1);
            liked = true;
        }

        documentRepository.save(document);

        Map<String, Object> result = new HashMap<>();
        result.put("liked", liked);
        result.put("likeCount", document.getLikeCount());

        return result;
    }

    @Override
    @Transactional
    public Map<String, Object> toggleFavorite(Long documentId) {
        Long userId = SecurityUtils.getCurrentUserId();
        Document document = getDocumentById(documentId);

        Optional<DocumentFavorite> existingFavorite = documentFavoriteRepository
                .findByDocumentIdAndUserId(documentId, userId);

        boolean favorited;
        if (existingFavorite.isPresent()) {
            documentFavoriteRepository.delete(existingFavorite.get());
            document.setFavoriteCount(document.getFavoriteCount() - 1);
            favorited = false;
        } else {
            DocumentFavorite favorite = new DocumentFavorite();
            favorite.setDocumentId(documentId);
            favorite.setUserId(userId);
            documentFavoriteRepository.save(favorite);
            document.setFavoriteCount(document.getFavoriteCount() + 1);
            favorited = true;
        }

        documentRepository.save(document);

        Map<String, Object> result = new HashMap<>();
        result.put("favorited", favorited);
        result.put("favoriteCount", document.getFavoriteCount());

        return result;
    }

    @Override
    public String uploadImage(MultipartFile file) {
        String objectName = fileStorageService.uploadImage(file);
        return fileStorageService.getFileUrl(objectName);
    }

    @Override
    public String saveBase64Image(String base64Data) {
        String objectName = fileStorageService.saveBase64Image(base64Data, "images");
        return fileStorageService.getFileUrl(objectName);
    }

    @Override
    @Transactional
    public void batchDeleteDocuments(List<Long> ids) {
        Long userId = SecurityUtils.getCurrentUserId();
        LocalDateTime now = LocalDateTime.now();

        List<Document> documents = documentRepository.findAllById(ids);
        documents.forEach(doc -> {
            doc.setIsDeleted(true);
            doc.setDeletedAt(now);
            doc.setDeletedBy(userId);
        });

        documentRepository.saveAll(documents);
    }

    @Override
    @Transactional
    public void batchUpdateStatus(List<Long> ids, DocumentStatus status) {
        List<Document> documents = documentRepository.findAllById(ids);
        documents.forEach(doc -> doc.setStatus(status));
        documentRepository.saveAll(documents);
    }

    @Override
    public Page<Document> getPopularDocuments(Pageable pageable) {
        return documentRepository.findByIsDeletedFalseAndStatusOrderByViewCountDesc(
                DocumentStatus.APPROVED, pageable);
    }

    @Override
    public Page<Document> getRecentDocuments(Pageable pageable) {
        return documentRepository.findByIsDeletedFalseAndStatusOrderByUpdatedAtDesc(
                DocumentStatus.APPROVED, pageable);
    }

    @Override
    @Transactional
    public void incrementViewCount(Long documentId) {
        documentRepository.findById(documentId).ifPresent(doc -> {
            doc.setViewCount(doc.getViewCount() + 1);
            documentRepository.save(doc);
        });
    }

    @Override
    public List<Long> parseBacklinks(String content) {
        List<Long> linkedIds = new ArrayList<>();
        if (content == null) {
            return linkedIds;
        }

        Matcher matcher = WIKI_LINK_PATTERN.matcher(content);
        while (matcher.find()) {
            try {
                Long linkedId = Long.parseLong(matcher.group(1));
                linkedIds.add(linkedId);
            } catch (NumberFormatException e) {
                log.warn("Invalid wiki link format: {}", matcher.group(0));
            }
        }

        return linkedIds;
    }

    private void createVersion(Document document, String changeLog) {
        DocumentVersion version = new DocumentVersion();
        version.setDocumentId(document.getId());
        version.setVersion(document.getVersion());
        version.setTitle(document.getTitle());
        version.setContent(document.getContent());
        version.setContentHtml(document.getContentHtml());
        version.setChangeLog(changeLog);
        version.setCreatorId(document.getCreatorId());

        documentVersionRepository.save(version);
    }

    private void parseAndSaveLinks(Document document) {
        documentLinkRepository.deleteBySourceDocumentId(document.getId());

        List<Long> linkedIds = parseBacklinks(document.getContent());
        for (Long targetId : linkedIds) {
            if (documentRepository.existsById(targetId)) {
                DocumentLink link = new DocumentLink();
                link.setSourceDocumentId(document.getId());
                link.setTargetDocumentId(targetId);
                documentLinkRepository.save(link);
            }
        }
    }
}
