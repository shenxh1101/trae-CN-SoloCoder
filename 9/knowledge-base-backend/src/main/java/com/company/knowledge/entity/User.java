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
@Table(name = "sys_user")
@EqualsAndHashCode(callSuper = true)
public class User extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "username", unique = true, nullable = false, length = 50)
    private String username;

    @Column(name = "password", nullable = false, length = 255)
    private String password;

    @Column(name = "real_name", length = 50)
    private String realName;

    @Column(name = "email", unique = true, length = 100)
    private String email;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "avatar", length = 500)
    private String avatar;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @Column(name = "position", length = 50)
    private String position;

    @Column(name = "pinyin", length = 100)
    private String pinyin;

    @Column(name = "first_letter", length = 50)
    private String firstLetter;

    @Column(name = "last_login_time")
    private LocalDateTime lastLoginTime;

    @Column(name = "last_login_ip", length = 50)
    private String lastLoginIp;

    @Column(name = "login_count", columnDefinition = "int default 0")
    private Integer loginCount;

    @Column(name = "enabled", columnDefinition = "boolean default true")
    private Boolean enabled;

    @Column(name = "is_admin", columnDefinition = "boolean default false")
    private Boolean isAdmin;

    @Column(name = "ldap_dn", length = 255)
    private String ldapDn;
}
