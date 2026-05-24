package com.company.knowledge.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApprovalVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private Long id;

    private Long documentId;

    private String documentTitle;

    private String status;

    private String statusDesc;

    private Long applicantId;

    private String applicantName;

    private String applicantAvatar;

    private String currentNodeId;

    private String currentNodeName;

    private Long currentApproverId;

    private String currentApproverName;

    private String applyReason;

    private Integer priority;

    private Boolean isTimeout;

    private LocalDateTime submittedAt;

    private LocalDateTime completedAt;

    private LocalDateTime timeoutAt;

    private LocalDateTime createdAt;

    private List<ApprovalNodeVO> nodes;

    private List<ApprovalRecordVO> records;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApprovalNodeVO implements Serializable {

        @Serial
        private static final long serialVersionUID = 1L;

        private Long id;
        private String nodeId;
        private String nodeName;
        private String nodeType;
        private Long approverId;
        private String approverName;
        private String approverAvatar;
        private String status;
        private Boolean completed;
        private Integer sortOrder;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApprovalRecordVO implements Serializable {

        @Serial
        private static final long serialVersionUID = 1L;

        private Long id;
        private String nodeId;
        private String nodeName;
        private Long approverId;
        private String approverName;
        private String approverAvatar;
        private String action;
        private String actionDesc;
        private String comment;
        private String signImage;
        private LocalDateTime processedAt;
        private Long duration;
        private String durationDisplay;
    }
}
