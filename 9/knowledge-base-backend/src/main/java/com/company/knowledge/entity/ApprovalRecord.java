package com.company.knowledge.entity;

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
@Table(name = "ap_approval_record")
@EqualsAndHashCode(callSuper = true)
public class ApprovalRecord extends BaseEntity {

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

    @Column(name = "approver_id", nullable = false)
    private Long approverId;

    @Column(name = "approver_name", length = 50)
    private String approverName;

    @Column(name = "action", length = 20)
    private String action;

    @Column(name = "comment", length = 2000)
    private String comment;

    @Column(name = "sign_image", length = 500)
    private String signImage;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "duration", columnDefinition = "bigint default 0")
    private Long duration;
}
