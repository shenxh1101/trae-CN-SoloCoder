package com.company.knowledge.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class SubmitApprovalRequest {
    
    @NotNull(message = "文档ID不能为空")
    private Long documentId;
    
    @NotBlank(message = "申请原因不能为空")
    private String applyReason;
    
    private Integer priority = 0;
    
    @NotNull(message = "审批节点不能为空")
    private List<ApprovalNodeConfig> nodes;
    
    @Data
    public static class ApprovalNodeConfig {
        private String nodeName;
        private String nodeType;
        private Long approverId;
        private String approverName;
        private Boolean isRequired = true;
        private Integer sortOrder;
        private String signType;
    }
}
