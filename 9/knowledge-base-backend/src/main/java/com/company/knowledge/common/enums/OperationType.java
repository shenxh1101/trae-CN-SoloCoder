package com.company.knowledge.common.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum OperationType {

    LOGIN("login", "登录"),
    LOGOUT("logout", "登出"),
    REGISTER("register", "注册"),
    CREATE("create", "创建"),
    UPDATE("update", "更新"),
    DELETE("delete", "删除"),
    BATCH_DELETE("batch_delete", "批量删除"),
    BATCH_UPDATE("batch_update", "批量更新"),
    UPLOAD("upload", "上传"),
    DOWNLOAD("download", "下载"),
    VIEW("view", "查看"),
    PUBLISH("publish", "发布"),
    ROLLBACK("rollback", "回滚"),
    APPROVE("approve", "审批"),
    REJECT("reject", "驳回"),
    CANCEL("cancel", "撤销"),
    MOVE("move", "移动"),
    SHARE("share", "分享"),
    FAVORITE("favorite", "收藏"),
    LIKE("like", "点赞"),
    COMMENT("comment", "评论"),
    UPDATE_PASSWORD("update_password", "修改密码"),
    RESET_PASSWORD("reset_password", "重置密码"),
    UPDATE_STATUS("update_status", "更新状态"),
    UPDATE_PROFILE("update_profile", "更新资料"),
    UPDATE_AVATAR("update_avatar", "更新头像");

    private final String code;
    private final String description;
}
