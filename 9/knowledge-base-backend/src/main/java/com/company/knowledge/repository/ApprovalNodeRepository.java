package com.company.knowledge.repository;

import com.company.knowledge.entity.ApprovalNode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApprovalNodeRepository extends JpaRepository<ApprovalNode, Long>, JpaSpecificationExecutor<ApprovalNode> {

    List<ApprovalNode> findByApprovalIdOrderBySortOrderAsc(Long approvalId);

    Optional<ApprovalNode> findByApprovalIdAndNodeId(Long approvalId, String nodeId);

    void deleteByApprovalId(Long approvalId);
}
