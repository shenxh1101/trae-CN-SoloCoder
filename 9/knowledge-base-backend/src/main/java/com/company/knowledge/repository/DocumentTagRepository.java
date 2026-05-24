package com.company.knowledge.repository;

import com.company.knowledge.entity.DocumentTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentTagRepository extends JpaRepository<DocumentTag, Long>, JpaSpecificationExecutor<DocumentTag> {

    Optional<DocumentTag> findByName(String name);

    List<DocumentTag> findAllByOrderByUsageCountDesc();

    List<DocumentTag> findTop10ByOrderByUsageCountDesc();

    boolean existsByName(String name);
}
