package com.company.knowledge.common.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum PermissionType {

    MENU("menu", "菜单权限"),
    BUTTON("button", "按钮权限"),
    API("api", "接口权限"),
    DATA("data", "数据权限");

    private final String code;
    private final String description;
}
