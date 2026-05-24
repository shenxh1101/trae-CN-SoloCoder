package com.company.knowledge.repository;

import com.company.knowledge.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Long>, JpaSpecificationExecutor<Department> {

    Optional<Department> findByCode(String code);

    List<Department> findByParentId(Long parentId);

    List<Department> findByPathStartingWith(String path);

    List<Department> findByEnabledTrueOrderBySortOrderAsc();

    List<Department> findByNameContainingOrCodeContaining(String name, String code);

    boolean existsByCode(String code);

    boolean existsByParentId(Long parentId);

    long countByParentId(Long parentId);
}
