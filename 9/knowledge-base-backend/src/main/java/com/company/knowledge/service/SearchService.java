package com.company.knowledge.service;

import com.company.knowledge.dto.request.SearchRequest;
import com.company.knowledge.dto.response.SearchResult;

public interface SearchService {
    
    SearchResult search(SearchRequest request);
    
    SearchResult searchDocuments(String keyword, int page, int size);
    
    void syncDocument(Long documentId);
    
    void removeDocument(Long documentId);
    
    void rebuildIndex();
    
    String getSearchSuggestion(String keyword);
}
