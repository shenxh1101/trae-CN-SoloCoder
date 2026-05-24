package com.company.knowledge.service.impl;

import com.company.knowledge.entity.Document;
import com.company.knowledge.entity.DocumentTemplate;
import com.company.knowledge.common.enums.DocumentStatus;
import com.company.knowledge.repository.DocumentRepository;
import com.company.knowledge.repository.DocumentTemplateRepository;
import com.company.knowledge.service.TemplateService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TemplateServiceImpl implements TemplateService {
    
    private final DocumentTemplateRepository templateRepository;
    private final DocumentRepository documentRepository;
    
    @Override
    public Page<DocumentTemplate> getTemplateList(String category, Pageable pageable) {
        return templateRepository.findByEnabledTrue(pageable);
    }
    
    @Override
    public DocumentTemplate getTemplateDetail(Long id) {
        return templateRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("模板不存在"));
    }
    
    @Override
    @Transactional
    public DocumentTemplate createTemplate(DocumentTemplate template) {
        if (template.getUsageCount() == null) {
            template.setUsageCount(0);
        }
        if (template.getEnabled() == null) {
            template.setEnabled(true);
        }
        if (template.getIsPublic() == null) {
            template.setIsPublic(true);
        }
        if (template.getSortOrder() == null) {
            template.setSortOrder(0);
        }
        return templateRepository.save(template);
    }
    
    @Override
    @Transactional
    public DocumentTemplate updateTemplate(Long id, DocumentTemplate template) {
        DocumentTemplate existing = getTemplateDetail(id);
        existing.setName(template.getName());
        existing.setDescription(template.getDescription());
        existing.setContent(template.getContent());
        existing.setCategoryId(template.getCategoryId());
        existing.setThumbnail(template.getThumbnail());
        existing.setEnabled(template.getEnabled());
        existing.setIsPublic(template.getIsPublic());
        existing.setSortOrder(template.getSortOrder());
        return templateRepository.save(existing);
    }
    
    @Override
    @Transactional
    public void deleteTemplate(Long id) {
        DocumentTemplate template = getTemplateDetail(id);
        template.setEnabled(false);
        templateRepository.save(template);
    }
    
    @Override
    public List<DocumentTemplate> getPopularTemplates() {
        return templateRepository.findTop10ByEnabledTrueOrderByUsageCountDesc();
    }
    
    @Override
    @Transactional
    public Long createDocumentFromTemplate(Long templateId, Long userId) {
        DocumentTemplate template = getTemplateDetail(templateId);
        
        Document document = new Document();
        document.setTitle(template.getName());
        document.setContent(template.getContent());
        document.setStatus(DocumentStatus.DRAFT);
        document.setCreatorId(userId);
        document.setCreatorName("System");
        document.setViewCount(0L);
        document.setLikeCount(0);
        document.setCommentCount(0);
        document.setVersion(1);
        document.setIsDeleted(false);
        
        Document saved = documentRepository.save(document);
        
        templateRepository.incrementUsageCount(templateId);
        
        return saved.getId();
    }
    
    @Override
    public List<String> getCategories() {
        List<String> categories = new ArrayList<>();
        categories.add("policy");
        categories.add("procedure");
        categories.add("report");
        categories.add("plan");
        return categories;
    }
}
