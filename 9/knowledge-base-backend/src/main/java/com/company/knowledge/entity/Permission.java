package com.company.knowledge.entity;

import com.company.knowledge.common.enums.PermissionType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serial;
import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "sys_permission")
@EqualsAndHashCode(callSuper = true)
public class Permission extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "code", unique = true, nullable = false, length = 100)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private PermissionType type;

    @Column(name = "parent_id")
    private Long parentId;

    @Column(name = "path", length = 500)
    private String path;

    @Column(name = "component", length = 255)
    private String component;

    @Column(name = "icon", length = 100)
    private String icon;

    @Column(name = "sort_order", columnDefinition = "int default 0")
    private Integer sortOrder;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "enabled", columnDefinition = "boolean default true")
    private Boolean enabled;

    @Column(name = "api_method", length = 10)
    private String apiMethod;

    @Column(name = "api_path", length = 500)
    private String apiPath;

    @OneToMany(mappedBy = "parentId", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Permission> children = new ArrayList<>();
}
