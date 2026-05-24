package com.company.knowledge.repository;

import com.company.knowledge.entity.ApprovalRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApprovalRecordRepository extends JpaRepository<ApprovalRecord, Long>, JpaSpecificationExecutor<ApprovalRecord> {

    List<ApprovalRecord> findByApprovalIdOrderByProcessedAtDesc(Long approvalId);

    List<ApprovalRecord> findByApprovalIdOrderByProcessedAtAsc(Long approvalId);

    Page<ApprovalRecord> findByApproverIdOrderByProcessedAtDesc(Long approverId, Pageable pageable);

    void deleteByApprovalId(Long approvalId);
}
