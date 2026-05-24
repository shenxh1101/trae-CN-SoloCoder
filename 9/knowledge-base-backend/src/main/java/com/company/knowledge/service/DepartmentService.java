package com.company.knowledge.service;

import com.company.knowledge.entity.Department;
import com.company.knowledge.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;

public interface DepartmentService {

    List<Department> getDepartmentTree();

    Page<Department> listDepartments(Pageable pageable);

    Department getDepartmentById(Long id);

    List<Department> getChildren(Long parentId);

    List<Department> getDescendants(Long id);

    Department createDepartment(Department department);

    Department updateDepartment(Department department);

    void deleteDepartment(Long id);

    Department moveDepartment(Long id, Long parentId);

    Page<User> getDepartmentMembers(Long departmentId, Pageable pageable);

    Map<String, Object> getDepartmentStats(Long id);

    List<Department> searchDepartments(String keyword);

    String buildPath(Long parentId);
}
