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
@Table(name = "sys_api_token")
@EqualsAndHashCode(callSuper = true)
public class ApiToken extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "token", unique = true, nullable = false, length = 255)
    private String token;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "user_name", length = 50)
    private String userName;

    @Column(name = "expire_at")
    private LocalDateTime expireAt;

    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;

    @Column(name = "usage_count", columnDefinition = "bigint default 0")
    private Long usageCount;

    @Column(name = "ip_whitelist", length = 1000)
    private String ipWhitelist;

    @Column(name = "permissions", length = 2000)
    private String permissions;

    @Column(name = "enabled", columnDefinition = "boolean default true")
    private Boolean enabled;

    @Column(name = "description", length = 500)
    private String description;
}
