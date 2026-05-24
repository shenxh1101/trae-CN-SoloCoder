package com.company.knowledge.common.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ResultCode {

    SUCCESS(200, "操作成功"),
    BAD_REQUEST(400, "请求参数错误"),
    UNAUTHORIZED(401, "未授权"),
    FORBIDDEN(403, "禁止访问"),
    NOT_FOUND(404, "资源不存在"),
    METHOD_NOT_ALLOWED(405, "请求方法不允许"),
    CONFLICT(409, "数据冲突"),
    INTERNAL_ERROR(500, "服务器内部错误"),
    SERVICE_UNAVAILABLE(503, "服务不可用"),

    USER_NOT_FOUND(1001, "用户不存在"),
    USER_PASSWORD_ERROR(1002, "密码错误"),
    USER_DISABLED(1003, "用户已禁用"),
    USER_ALREADY_EXISTS(1004, "用户已存在"),
    TOKEN_EXPIRED(1005, "Token已过期"),
    TOKEN_INVALID(1006, "Token无效"),

    DOCUMENT_NOT_FOUND(2001, "文档不存在"),
    DOCUMENT_LOCKED(2002, "文档已被锁定"),
    DOCUMENT_PERMISSION_DENIED(2003, "无文档访问权限"),
    DOCUMENT_VERSION_NOT_FOUND(2004, "文档版本不存在"),

    APPROVAL_NOT_FOUND(3001, "审批不存在"),
    APPROVAL_ALREADY_PROCESSED(3002, "审批已处理"),
    APPROVAL_PERMISSION_DENIED(3003, "无审批权限"),

    FILE_UPLOAD_ERROR(4001, "文件上传失败"),
    FILE_DOWNLOAD_ERROR(4002, "文件下载失败"),
    FILE_TYPE_NOT_ALLOWED(4003, "文件类型不允许"),
    FILE_SIZE_EXCEEDED(4004, "文件大小超出限制"),

    DEPARTMENT_NOT_FOUND(5001, "部门不存在"),
    PERMISSION_DENIED(6001, "权限不足"),
    PARAMETER_VALIDATION_ERROR(7001, "参数校验失败");

    private final Integer code;
    private final String message;
}
