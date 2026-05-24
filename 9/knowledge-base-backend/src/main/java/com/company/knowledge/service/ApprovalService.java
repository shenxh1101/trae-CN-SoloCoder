package com.company.knowledge.service;

import com.company.knowledge.common.enums.ApprovalStatus;
import com.company.knowledge.dto.request.ProcessApprovalRequest;
import com.company.knowledge.dto.request.SubmitApprovalRequest;
import com.company.knowledge.dto.response.ApprovalDetailResponse;
import com.company.knowledge.entity.Approval;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;

public interface ApprovalService {
    
    Approval submitApproval(SubmitApprovalRequest request);
    
    Approval processApproval(ProcessApprovalRequest request);
    
    Approval cancelApproval(Long approvalId);
    
    ApprovalDetailResponse getApprovalDetail(Long approvalId);
    
    Page<Approval> getMyPendingApprovals(Pageable pageable);
    
    Page<Approval> getMyApprovalHistory(Pageable pageable);
    
    Page<Approval> getMyInitiatedApprovals(Pageable pageable);
    
    long getPendingApprovalCount();
    
    Map<String, Object> getApprovalStats();
    
    Page<Approval> getApprovalsByDocument(Long documentId, Pageable pageable);
    
    List<Approval> getPendingApprovalsByDocument(Long documentId);
    
    void updateApprovalStatus(Long approvalId, ApprovalStatus status);
}
