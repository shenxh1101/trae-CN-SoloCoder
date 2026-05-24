package com.company.knowledge.repository;

import com.company.knowledge.entity.ApiToken;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface ApiTokenRepository extends JpaRepository<ApiToken, Long>, JpaSpecificationExecutor<ApiToken> {

    Optional<ApiToken> findByToken(String token);

    Page<ApiToken> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    @Modifying
    @Query("UPDATE ApiToken t SET t.lastUsedAt = :now, t.usageCount = t.usageCount + 1 WHERE t.id = :id")
    void updateLastUsedAt(@Param("id") Long id, @Param("now") LocalDateTime now);

    boolean existsByToken(String token);
}
