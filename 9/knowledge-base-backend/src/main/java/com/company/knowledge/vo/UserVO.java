package com.company.knowledge.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private Long id;

    private String username;

    private String realName;

    private String email;

    private String phone;

    private String avatar;

    private Long departmentId;

    private String departmentName;

    private String departmentCode;

    private String position;

    private String pinyin;

    private String firstLetter;

    private Boolean enabled;

    private Boolean isAdmin;

    private LocalDateTime lastLoginTime;

    private String lastLoginIp;

    private Integer loginCount;

    private LocalDateTime createdAt;
}
