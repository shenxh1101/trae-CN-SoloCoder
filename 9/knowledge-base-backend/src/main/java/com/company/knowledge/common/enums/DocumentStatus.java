package com.company.knowledge.common.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum DocumentStatus {

    DRAFT("draft", "草稿"),
    PENDING("pending", "待审核"),
    APPROVED("approved", "已发布"),
    REJECTED("rejected", "已拒绝"),
    ARCHIVED("archived", "已归档"),
    DELETED("deleted", "已删除");

    private final String code;
    private final String description;
}
