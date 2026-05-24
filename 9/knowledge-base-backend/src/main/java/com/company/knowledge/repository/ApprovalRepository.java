package com.company.knowledge.repository;

import com.company.knowledge.common.enums.ApprovalStatus;
import com.company.knowledge.entity.Approval;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApprovalRepository extends JpaRepository<Approval, Long>, JpaSpecificationExecutor<Approval> {

    Optional<Approval> findByDocumentIdAndStatus(Long documentId, ApprovalStatus status);

    Page<Approval> findByApplicantIdOrderBySubmittedAtDesc(Long applicantId, Pageable pageable);

    Page<Approval> findByCurrentApproverIdAndStatus(Long approverId, ApprovalStatus status, Pageable pageable);

    @Query("SELECT a FROM Approval a WHERE a.currentApproverId = :approverId AND a.status = 'PENDING'")
    List<Approval> findPendingApprovalsByApproverId(@Param("approverId") Long approverId);

    long countByCurrentApproverIdAndStatus(Long approverId, ApprovalStatus status);

    Optional<Approval> findByProcessInstanceId(String processInstanceId);
}
