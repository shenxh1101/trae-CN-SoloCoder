package com.company.knowledge.entity;

import com.company.knowledge.common.enums.OperationType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serial;
import java.time.LocalDateTime;

@Data
@Builder
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "sys_operation_log")
@EqualsAndHashCode(callSuper = true)
public class OperationLog extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "module", length = 50)
    private String module;

    @Enumerated(EnumType.STRING)
    @Column(name = "operation_type", length = 20)
    private OperationType operationType;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "user_name", length = 50)
    private String userName;

    @Column(name = "department_id")
    private Long departmentId;

    @Column(name = "department_name", length = 100)
    private String departmentName;

    @Column(name = "request_method", length = 10)
    private String requestMethod;

    @Column(name = "request_url", length = 500)
    private String requestUrl;

    @Column(name = "request_params", columnDefinition = "TEXT")
    private String requestParams;

    @Column(name = "response_result", columnDefinition = "TEXT")
    private String responseResult;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(name = "ip_location", length = 100)
    private String ipLocation;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "browser", length = 100)
    private String browser;

    @Column(name = "os", length = 100)
    private String os;

    @Column(name = "operation_time", nullable = false)
    private LocalDateTime operationTime;

    @Column(name = "cost_time", columnDefinition = "bigint default 0")
    private Long costTime;

    @Column(name = "success", columnDefinition = "boolean default true")
    private Boolean success;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;
}
