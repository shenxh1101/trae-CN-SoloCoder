package com.company.knowledge.controller;

import com.company.knowledge.common.annotation.OperationLog;
import com.company.knowledge.common.enums.OperationType;
import com.company.knowledge.common.exception.Result;
import com.company.knowledge.dto.request.ProcessApprovalRequest;
import com.company.knowledge.dto.request.SubmitApprovalRequest;
import com.company.knowledge.dto.response.ApprovalDetailResponse;
import com.company.knowledge.entity.Approval;
import com.company.knowledge.service.ApprovalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "审批管理", description = "审批流程管理")
@RestController
@RequestMapping("/api/approvals")
@RequiredArgsConstructor
public class ApprovalController {
    
    private final ApprovalService approvalService;
    
    @Operation(summary = "提交审批", description = "提交文档审批流程")
    @PostMapping
    @OperationLog(module = "审批管理", type = OperationType.CREATE)
    public Result<Approval> submitApproval(@Valid @RequestBody SubmitApprovalRequest request) {
        Approval approval = approvalService.submitApproval(request);
        return Result.success(approval);
    }
    
    @Operation(summary = "审批操作", description = "同意/驳回审批")
    @PostMapping("/process")
    @OperationLog(module = "审批管理", type = OperationType.UPDATE)
    public Result<Approval> processApproval(@Valid @RequestBody ProcessApprovalRequest request) {
        Approval approval = approvalService.processApproval(request);
        return Result.success(approval);
    }
    
    @Operation(summary = "撤销审批", description = "撤销已提交的审批")
    @PostMapping("/{id}/cancel")
    @OperationLog(module = "审批管理", type = OperationType.CANCEL)
    public Result<Approval> cancelApproval(@PathVariable Long id) {
        Approval approval = approvalService.cancelApproval(id);
        return Result.success(approval);
    }
    
    @Operation(summary = "获取审批详情", description = "获取审批详情及审批记录")
    @GetMapping("/{id}")
    public Result<ApprovalDetailResponse> getDetail(@PathVariable Long id) {
        ApprovalDetailResponse detail = approvalService.getApprovalDetail(id);
        return Result.success(detail);
    }
    
    @Operation(summary = "待我审批", description = "获取待我审批的列表")
    @GetMapping("/pending")
    public Result<Page<Approval>> getPending(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "submittedAt"));
        Page<Approval> approvals = approvalService.getMyPendingApprovals(pageable);
        return Result.success(approvals);
    }
    
    @Operation(summary = "我发起的审批", description = "获取我发起的审批列表")
    @GetMapping("/initiated")
    public Result<Page<Approval>> getInitiated(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "submittedAt"));
        Page<Approval> approvals = approvalService.getMyInitiatedApprovals(pageable);
        return Result.success(approvals);
    }
    
    @Operation(summary = "我审批过的", description = "获取我的审批历史")
    @GetMapping("/history")
    public Result<Page<Approval>> getHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Approval> approvals = approvalService.getMyApprovalHistory(pageable);
        return Result.success(approvals);
    }
    
    @Operation(summary = "待审批数量", description = "获取待我审批的数量")
    @GetMapping("/pending-count")
    public Result<Long> getPendingCount() {
        long count = approvalService.getPendingApprovalCount();
        return Result.success(count);
    }
    
    @Operation(summary = "审批统计", description = "获取审批统计数据")
    @GetMapping("/stats")
    public Result<Map<String, Object>> getStats() {
        Map<String, Object> stats = approvalService.getApprovalStats();
        return Result.success(stats);
    }
    
    @Operation(summary = "文档审批记录", description = "获取文档的审批历史")
    @GetMapping("/document/{documentId}")
    public Result<Page<Approval>> getByDocument(
            @PathVariable Long documentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "submittedAt"));
        Page<Approval> approvals = approvalService.getApprovalsByDocument(documentId, pageable);
        return Result.success(approvals);
    }
    
    @Operation(summary = "文档待审批", description = "获取文档的待审批记录")
    @GetMapping("/document/{documentId}/pending")
    public Result<List<Approval>> getPendingByDocument(@PathVariable Long documentId) {
        List<Approval> approvals = approvalService.getPendingApprovalsByDocument(documentId);
        return Result.success(approvals);
    }
}
