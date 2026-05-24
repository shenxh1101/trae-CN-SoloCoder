package com.company.knowledge.service;

import com.company.knowledge.entity.DocumentTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface TemplateService {
    
    Page<DocumentTemplate> getTemplateList(String category, Pageable pageable);
    
    DocumentTemplate getTemplateDetail(Long id);
    
    DocumentTemplate createTemplate(DocumentTemplate template);
    
    DocumentTemplate updateTemplate(Long id, DocumentTemplate template);
    
    void deleteTemplate(Long id);
    
    List<DocumentTemplate> getPopularTemplates();
    
    Long createDocumentFromTemplate(Long templateId, Long userId);
    
    List<String> getCategories();
}
