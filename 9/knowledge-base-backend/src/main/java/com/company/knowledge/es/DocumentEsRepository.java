package com.company.knowledge.es;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.annotations.Query;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DocumentEsRepository extends ElasticsearchRepository<DocumentEsDoc, Long> {

    @Query("{\"bool\": {\"must\": [{\"multi_match\": {\"query\": \"?0\", \"fields\": [\"title^3\", \"summary^2\", \"content\"], \"type\": \"best_fields\"}}, {\"term\": {\"isDeleted\": false}}, {\"term\": {\"status\": \"approved\"}}]}}")
    Page<DocumentEsDoc> search(String keyword, Pageable pageable);

    @Query("{\"bool\": {\"must\": [{\"multi_match\": {\"query\": \"?0\", \"fields\": [\"titlePinyin\", \"titleFirstLetter\"]}}, {\"term\": {\"isDeleted\": false}}, {\"term\": {\"status\": \"approved\"}}]}}")
    Page<DocumentEsDoc> searchByPinyin(String pinyin, Pageable pageable);

    @Query("{\"bool\": {\"must\": [{\"term\": {\"tags\": \"?0\"}}, {\"term\": {\"isDeleted\": false}}, {\"term\": {\"status\": \"approved\"}}]}}")
    Page<DocumentEsDoc> findByTag(String tag, Pageable pageable);

    @Query("{\"bool\": {\"must\": [{\"term\": {\"createdBy\": ?0}}, {\"term\": {\"isDeleted\": false}}]}}")
    Page<DocumentEsDoc> findByCreatedBy(@Param("createdBy") Long createdBy, Pageable pageable);
}
