package com.company.knowledge.repository;

import com.company.knowledge.entity.OperationLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface OperationLogRepository extends JpaRepository<OperationLog, Long>, JpaSpecificationExecutor<OperationLog> {

    Page<OperationLog> findByUserIdOrderByOperationTimeDesc(Long userId, Pageable pageable);

    Page<OperationLog> findByModuleOrderByOperationTimeDesc(String module, Pageable pageable);

    void deleteByOperationTimeBefore(LocalDateTime time);
}
