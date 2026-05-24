package com.company.knowledge.dto.response;

import com.company.knowledge.entity.Approval;
import com.company.knowledge.entity.ApprovalNode;
import com.company.knowledge.entity.ApprovalRecord;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApprovalDetailResponse {
    private Long id;
    private Long documentId;
    private String documentTitle;
    private String status;
    private String statusName;
    private Long applicantId;
    private String applicantName;
    private String applyReason;
    private Integer priority;
    private String currentNodeId;
    private String currentNodeName;
    private Long currentApproverId;
    private String currentApproverName;
    private LocalDateTime submittedAt;
    private LocalDateTime completedAt;
    private LocalDateTime timeoutAt;
    private Boolean isTimeout;
    private List<ApprovalNode> nodes;
    private List<ApprovalRecord> records;
    
    public static ApprovalDetailResponse fromEntity(Approval approval) {
        return ApprovalDetailResponse.builder()
                .id(approval.getId())
                .documentId(approval.getDocumentId())
                .documentTitle(approval.getDocumentTitle())
                .status(approval.getStatus().getCode())
                .statusName(approval.getStatus().getDescription())
                .applicantId(approval.getApplicantId())
                .applicantName(approval.getApplicantName())
                .applyReason(approval.getApplyReason())
                .priority(approval.getPriority())
                .currentNodeId(approval.getCurrentNodeId())
                .currentNodeName(approval.getCurrentNodeName())
                .currentApproverId(approval.getCurrentApproverId())
                .currentApproverName(approval.getCurrentApproverName())
                .submittedAt(approval.getSubmittedAt())
                .completedAt(approval.getCompletedAt())
                .timeoutAt(approval.getTimeoutAt())
                .isTimeout(approval.getIsTimeout())
                .build();
    }
}
