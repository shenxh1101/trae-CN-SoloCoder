package com.company.knowledge.common.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ApprovalStatus {

    PENDING("pending", "待审批"),
    APPROVED("approved", "已通过"),
    REJECTED("rejected", "已拒绝"),
    CANCELED("canceled", "已取消"),
    TIMEOUT("timeout", "已超时");

    private final String code;
    private final String description;
}
