package com.company.knowledge.repository;

import com.company.knowledge.common.enums.PermissionType;
import com.company.knowledge.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, Long>, JpaSpecificationExecutor<Permission> {

    Optional<Permission> findByCode(String code);

    List<Permission> findByParentId(Long parentId);

    List<Permission> findByTypeAndEnabledTrueOrderBySortOrderAsc(PermissionType type);

    List<Permission> findByEnabledTrueOrderBySortOrderAsc();

    boolean existsByCode(String code);
}
