package com.company.knowledge.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serial;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "ap_approval_node")
@EqualsAndHashCode(callSuper = true)
public class ApprovalNode extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "approval_id", nullable = false)
    private Long approvalId;

    @Column(name = "node_id", length = 64)
    private String nodeId;

    @Column(name = "node_name", length = 100)
    private String nodeName;

    @Column(name = "node_type", length = 20)
    private String nodeType;

    @Column(name = "approver_id")
    private Long approverId;

    @Column(name = "approver_name", length = 50)
    private String approverName;

    @Column(name = "approver_type", length = 20)
    private String approverType;

    @Column(name = "sort_order", columnDefinition = "int default 0")
    private Integer sortOrder;

    @Column(name = "is_required", columnDefinition = "boolean default true")
    private Boolean isRequired;

    @Column(name = "status", length = 20)
    private String status;

    @Column(name = "completed")
    private Boolean completed;
}
