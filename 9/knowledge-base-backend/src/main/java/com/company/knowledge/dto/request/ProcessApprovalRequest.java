package com.company.knowledge.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ProcessApprovalRequest {
    
    @NotNull(message = "审批ID不能为空")
    private Long approvalId;
    
    @NotBlank(message = "审批结果不能为空")
    private String action;
    
    private String comment;
    
    private String signImage;
}
