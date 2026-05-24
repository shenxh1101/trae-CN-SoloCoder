package com.company.knowledge.entity;

import com.company.knowledge.common.enums.ApprovalStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serial;
import java.time.LocalDateTime;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "ap_approval")
@EqualsAndHashCode(callSuper = true)
public class Approval extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id", nullable = false)
    private Long documentId;

    @Column(name = "document_title", length = 200)
    private String documentTitle;

    @Column(name = "process_instance_id", length = 64)
    private String processInstanceId;

    @Column(name = "process_definition_key", length = 64)
    private String processDefinitionKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ApprovalStatus status;

    @Column(name = "applicant_id", nullable = false)
    private Long applicantId;

    @Column(name = "applicant_name", length = 50)
    private String applicantName;

    @Column(name = "current_node_id", length = 64)
    private String currentNodeId;

    @Column(name = "current_node_name", length = 100)
    private String currentNodeName;

    @Column(name = "current_approver_id")
    private Long currentApproverId;

    @Column(name = "current_approver_name", length = 50)
    private String currentApproverName;

    @Column(name = "apply_reason", length = 1000)
    private String applyReason;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "timeout_at")
    private LocalDateTime timeoutAt;

    @Column(name = "is_timeout", columnDefinition = "boolean default false")
    private Boolean isTimeout;

    @Column(name = "priority", columnDefinition = "int default 0")
    private Integer priority;
}
