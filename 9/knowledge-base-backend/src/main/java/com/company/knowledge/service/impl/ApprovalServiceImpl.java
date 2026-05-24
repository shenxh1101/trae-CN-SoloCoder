package com.company.knowledge.service.impl;

import com.company.knowledge.common.enums.ApprovalStatus;
import com.company.knowledge.common.enums.DocumentStatus;
import com.company.knowledge.common.enums.ResultCode;
import com.company.knowledge.common.exception.BusinessException;
import com.company.knowledge.common.utils.SecurityUtils;
import com.company.knowledge.dto.request.ProcessApprovalRequest;
import com.company.knowledge.dto.request.SubmitApprovalRequest;
import com.company.knowledge.dto.response.ApprovalDetailResponse;
import com.company.knowledge.entity.Approval;
import com.company.knowledge.entity.ApprovalNode;
import com.company.knowledge.entity.ApprovalRecord;
import com.company.knowledge.entity.Document;
import com.company.knowledge.entity.User;
import com.company.knowledge.repository.ApprovalNodeRepository;
import com.company.knowledge.repository.ApprovalRecordRepository;
import com.company.knowledge.repository.ApprovalRepository;
import com.company.knowledge.repository.DocumentRepository;
import com.company.knowledge.repository.UserRepository;
import com.company.knowledge.service.ApprovalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApprovalServiceImpl implements ApprovalService {
    
    private final ApprovalRepository approvalRepository;
    private final ApprovalNodeRepository approvalNodeRepository;
    private final ApprovalRecordRepository approvalRecordRepository;
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    
    @Override
    @Transactional
    public Approval submitApproval(SubmitApprovalRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        User applicant = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ResultCode.NOT_FOUND, "用户不存在"));
        
        Document document = documentRepository.findById(request.getDocumentId())
                .orElseThrow(() -> new BusinessException(ResultCode.NOT_FOUND, "文档不存在"));
        
        if (!document.getCreatorId().equals(userId)) {
            throw new BusinessException(ResultCode.FORBIDDEN, "只有文档创建者才能提交审批");
        }
        
        if (document.getStatus() == DocumentStatus.PENDING) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "该文档正在审批中");
        }
        
        if (request.getNodes() == null || request.getNodes().isEmpty()) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "请指定审批人");
        }
        
        request.getNodes().sort(Comparator.comparingInt(SubmitApprovalRequest.ApprovalNodeConfig::getSortOrder));
        
        Approval approval = new Approval();
        approval.setDocumentId(document.getId());
        approval.setDocumentTitle(document.getTitle());
        approval.setStatus(ApprovalStatus.PENDING);
        approval.setApplicantId(userId);
        approval.setApplicantName(applicant.getRealName());
        approval.setApplyReason(request.getApplyReason());
        approval.setPriority(request.getPriority());
        approval.setSubmittedAt(LocalDateTime.now());
        approval.setTimeoutAt(LocalDateTime.now().plusDays(7));
        approval.setIsTimeout(false);
        
        SubmitApprovalRequest.ApprovalNodeConfig firstNode = request.getNodes().get(0);
        approval.setCurrentNodeId("node_" + firstNode.getSortOrder());
        approval.setCurrentNodeName(firstNode.getNodeName());
        approval.setCurrentApproverId(firstNode.getApproverId());
        approval.setCurrentApproverName(firstNode.getApproverName());
        
        approval = approvalRepository.save(approval);
        
        List<ApprovalNode> approvalNodes = new ArrayList<>();
        for (int i = 0; i < request.getNodes().size(); i++) {
            SubmitApprovalRequest.ApprovalNodeConfig nodeConfig = request.getNodes().get(i);
            ApprovalNode node = new ApprovalNode();
            node.setApprovalId(approval.getId());
            node.setNodeId("node_" + nodeConfig.getSortOrder());
            node.setNodeName(nodeConfig.getNodeName());
            node.setNodeType(nodeConfig.getNodeType() != null ? nodeConfig.getNodeType() : "AND_SIGN");
            node.setApproverId(nodeConfig.getApproverId());
            node.setApproverName(nodeConfig.getApproverName());
            node.setApproverType("USER");
            node.setSortOrder(nodeConfig.getSortOrder());
            node.setIsRequired(nodeConfig.getIsRequired());
            node.setStatus(i == 0 ? "PENDING" : "WAITING");
            node.setCompleted(false);
            approvalNodes.add(node);
        }
        approvalNodeRepository.saveAll(approvalNodes);
        
        document.setStatus(DocumentStatus.PENDING);
        documentRepository.save(document);
        
        log.info("Approval submitted: documentId={}, applicantId={}", document.getId(), userId);
        return approval;
    }
    
    @Override
    @Transactional
    public Approval processApproval(ProcessApprovalRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        Approval approval = approvalRepository.findById(request.getApprovalId())
                .orElseThrow(() -> new BusinessException(ResultCode.NOT_FOUND, "审批不存在"));
        
        if (approval.getStatus() != ApprovalStatus.PENDING) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "该审批已处理");
        }
        
        if (!approval.getCurrentApproverId().equals(userId)) {
            throw new BusinessException(ResultCode.FORBIDDEN, "您不是当前审批人");
        }
        
        String action = request.getAction().toUpperCase();
        ApprovalRecord record = new ApprovalRecord();
        record.setApprovalId(approval.getId());
        record.setNodeId(approval.getCurrentNodeId());
        record.setNodeName(approval.getCurrentNodeName());
        record.setApproverId(userId);
        record.setApproverName(userRepository.findById(userId).map(User::getRealName).orElse(""));
        record.setAction(action);
        record.setComment(request.getComment());
        record.setSignImage(request.getSignImage());
        record.setProcessedAt(LocalDateTime.now());
        record.setDuration(System.currentTimeMillis() - approval.getSubmittedAt().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli());
        approvalRecordRepository.save(record);
        
        ApprovalNode currentNode = approvalNodeRepository.findByApprovalIdAndNodeId(
                approval.getId(), approval.getCurrentNodeId()).orElse(null);
        if (currentNode != null) {
            currentNode.setStatus(action.equals("APPROVED") ? "APPROVED" : "REJECTED");
            currentNode.setCompleted(true);
            approvalNodeRepository.save(currentNode);
        }
        
        Document document = documentRepository.findById(approval.getDocumentId()).orElse(null);
        
        if (action.equals("REJECTED")) {
            approval.setStatus(ApprovalStatus.REJECTED);
            approval.setCompletedAt(LocalDateTime.now());
            
            if (document != null) {
                document.setStatus(DocumentStatus.REJECTED);
                documentRepository.save(document);
            }
            
            log.info("Approval rejected: approvalId={}, approverId={}", approval.getId(), userId);
            return approvalRepository.save(approval);
        }
        
        if (action.equals("APPROVED")) {
            List<ApprovalNode> nodes = approvalNodeRepository.findByApprovalIdOrderBySortOrderAsc(approval.getId());
            int currentIndex = -1;
            for (int i = 0; i < nodes.size(); i++) {
                if (nodes.get(i).getNodeId().equals(approval.getCurrentNodeId())) {
                    currentIndex = i;
                    break;
                }
            }
            
            if (currentIndex >= 0 && currentIndex < nodes.size() - 1) {
                ApprovalNode nextNode = nodes.get(currentIndex + 1);
                approval.setCurrentNodeId(nextNode.getNodeId());
                approval.setCurrentNodeName(nextNode.getNodeName());
                approval.setCurrentApproverId(nextNode.getApproverId());
                approval.setCurrentApproverName(nextNode.getApproverName());
                
                nextNode.setStatus("PENDING");
                approvalNodeRepository.save(nextNode);
                
                log.info("Approval progressed: approvalId={}, nextNode={}", approval.getId(), nextNode.getNodeName());
                return approvalRepository.save(approval);
            } else {
                approval.setStatus(ApprovalStatus.APPROVED);
                approval.setCompletedAt(LocalDateTime.now());
                
                if (document != null) {
                    document.setStatus(DocumentStatus.APPROVED);
                    document.setPublishedAt(LocalDateTime.now());
                    documentRepository.save(document);
                }
                
                log.info("Approval completed: approvalId={}", approval.getId());
                return approvalRepository.save(approval);
            }
        }
        
        throw new BusinessException(ResultCode.BAD_REQUEST, "不支持的审批操作");
    }
    
    @Override
    @Transactional
    public Approval cancelApproval(Long approvalId) {
        Long userId = SecurityUtils.getCurrentUserId();
        Approval approval = approvalRepository.findById(approvalId)
                .orElseThrow(() -> new BusinessException(ResultCode.NOT_FOUND, "审批不存在"));
        
        if (!approval.getApplicantId().equals(userId)) {
            throw new BusinessException(ResultCode.FORBIDDEN, "只有发起人才能撤销审批");
        }
        
        if (approval.getStatus() != ApprovalStatus.PENDING) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "该审批已处理，无法撤销");
        }
        
        approval.setStatus(ApprovalStatus.CANCELED);
        approval.setCompletedAt(LocalDateTime.now());
        
        Document document = documentRepository.findById(approval.getDocumentId()).orElse(null);
        if (document != null) {
            document.setStatus(DocumentStatus.DRAFT);
            documentRepository.save(document);
        }
        
        log.info("Approval canceled: approvalId={}", approvalId);
        return approvalRepository.save(approval);
    }
    
    @Override
    public ApprovalDetailResponse getApprovalDetail(Long approvalId) {
        Approval approval = approvalRepository.findById(approvalId)
                .orElseThrow(() -> new BusinessException(ResultCode.NOT_FOUND, "审批不存在"));
        
        ApprovalDetailResponse response = ApprovalDetailResponse.fromEntity(approval);
        
        List<ApprovalNode> nodes = approvalNodeRepository.findByApprovalIdOrderBySortOrderAsc(approvalId);
        response.setNodes(nodes);
        
        List<ApprovalRecord> records = approvalRecordRepository.findByApprovalIdOrderByProcessedAtDesc(approvalId);
        response.setRecords(records);
        
        return response;
    }
    
    @Override
    public Page<Approval> getMyPendingApprovals(Pageable pageable) {
        Long userId = SecurityUtils.getCurrentUserId();
        return approvalRepository.findByCurrentApproverIdAndStatus(userId, ApprovalStatus.PENDING, pageable);
    }
    
    @Override
    public Page<Approval> getMyApprovalHistory(Pageable pageable) {
        Long userId = SecurityUtils.getCurrentUserId();
        return approvalRecordRepository.findByApproverIdOrderByProcessedAtDesc(userId, pageable)
                .map(record -> approvalRepository.findById(record.getApprovalId()).orElse(null));
    }
    
    @Override
    public Page<Approval> getMyInitiatedApprovals(Pageable pageable) {
        Long userId = SecurityUtils.getCurrentUserId();
        return approvalRepository.findByApplicantIdOrderBySubmittedAtDesc(userId, pageable);
    }
    
    @Override
    public long getPendingApprovalCount() {
        Long userId = SecurityUtils.getCurrentUserId();
        return approvalRepository.countByCurrentApproverIdAndStatus(userId, ApprovalStatus.PENDING);
    }
    
    @Override
    public Map<String, Object> getApprovalStats() {
        Long userId = SecurityUtils.getCurrentUserId();
        Map<String, Object> stats = new HashMap<>();
        
        long pendingCount = approvalRepository.countByCurrentApproverIdAndStatus(userId, ApprovalStatus.PENDING);
        stats.put("pendingCount", pendingCount);
        
        Page<Approval> initiated = approvalRepository.findByApplicantIdOrderBySubmittedAtDesc(userId, Pageable.unpaged());
        stats.put("initiatedCount", initiated.getTotalElements());
        
        long approvedCount = initiated.getContent().stream()
                .filter(a -> a.getStatus() == ApprovalStatus.APPROVED)
                .count();
        stats.put("approvedCount", approvedCount);
        
        long rejectedCount = initiated.getContent().stream()
                .filter(a -> a.getStatus() == ApprovalStatus.REJECTED)
                .count();
        stats.put("rejectedCount", rejectedCount);
        
        return stats;
    }
    
    @Override
    public Page<Approval> getApprovalsByDocument(Long documentId, Pageable pageable) {
        return approvalRepository.findAll((root, query, cb) -> 
            cb.equal(root.get("documentId"), documentId), pageable);
    }
    
    @Override
    public List<Approval> getPendingApprovalsByDocument(Long documentId) {
        Optional<Approval> pending = approvalRepository.findByDocumentIdAndStatus(documentId, ApprovalStatus.PENDING);
        return pending.map(List::of).orElseGet(List::of);
    }
    
    @Override
    @Transactional
    public void updateApprovalStatus(Long approvalId, ApprovalStatus status) {
        Approval approval = approvalRepository.findById(approvalId)
                .orElseThrow(() -> new BusinessException(ResultCode.NOT_FOUND, "审批不存在"));
        approval.setStatus(status);
        approvalRepository.save(approval);
    }
}
