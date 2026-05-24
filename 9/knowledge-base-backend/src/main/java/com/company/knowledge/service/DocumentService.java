package com.company.knowledge.service;

import com.company.knowledge.common.enums.DocumentStatus;
import com.company.knowledge.dto.request.DocumentCreateRequest;
import com.company.knowledge.dto.request.DocumentUpdateRequest;
import com.company.knowledge.entity.Document;
import com.company.knowledge.entity.DocumentVersion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

public interface DocumentService {

    Page<Document> listDocuments(String keyword, DocumentStatus status, Long departmentId,
                                  Long creatorId, String tag, Pageable pageable);

    Document getDocumentById(Long id);

    Page<Document> getMyDocuments(DocumentStatus status, Pageable pageable);

    Page<Document> getMyFavorites(Pageable pageable);

    Document createDocument(DocumentCreateRequest request);

    Document updateDocument(Long id, DocumentUpdateRequest request);

    void deleteDocument(Long id);

    Document publishDocument(Long id);

    List<DocumentVersion> getDocumentVersions(Long documentId);

    DocumentVersion getDocumentVersion(Long documentId, Long versionId);

    Document rollbackToVersion(Long documentId, Long versionId);

    List<Map<String, Object>> getDocumentLinks(Long documentId);

    List<Document> getBacklinks(Long documentId);

    Map<String, Object> toggleLike(Long documentId);

    Map<String, Object> toggleFavorite(Long documentId);

    String uploadImage(MultipartFile file);

    String saveBase64Image(String base64Data);

    void batchDeleteDocuments(List<Long> ids);

    void batchUpdateStatus(List<Long> ids, DocumentStatus status);

    Page<Document> getPopularDocuments(Pageable pageable);

    Page<Document> getRecentDocuments(Pageable pageable);

    void incrementViewCount(Long documentId);

    List<Long> parseBacklinks(String content);
}
