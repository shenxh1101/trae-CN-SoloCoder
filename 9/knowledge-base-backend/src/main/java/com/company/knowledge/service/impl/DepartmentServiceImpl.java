package com.company.knowledge.service.impl;

import com.company.knowledge.common.enums.ResultCode;
import com.company.knowledge.common.exception.BusinessException;
import com.company.knowledge.entity.Department;
import com.company.knowledge.entity.User;
import com.company.knowledge.repository.DepartmentRepository;
import com.company.knowledge.repository.UserRepository;
import com.company.knowledge.service.DepartmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DepartmentServiceImpl implements DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;

    @Override
    public List<Department> getDepartmentTree() {
        List<Department> allDepartments = departmentRepository.findAll();
        return buildTree(allDepartments, null);
    }

    private List<Department> buildTree(List<Department> all, Long parentId) {
        return all.stream()
                .filter(d -> Objects.equals(parentId, d.getParentId()))
                .peek(d -> d.setChildren(buildTree(all, d.getId())))
                .collect(Collectors.toList());
    }

    @Override
    public Page<Department> listDepartments(Pageable pageable) {
        return departmentRepository.findAll(pageable);
    }

    @Override
    public Department getDepartmentById(Long id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ResultCode.NOT_FOUND, "部门不存在"));
    }

    @Override
    public List<Department> getChildren(Long parentId) {
        return departmentRepository.findByParentId(parentId);
    }

    @Override
    public List<Department> getDescendants(Long id) {
        Department department = getDepartmentById(id);
        String pathPrefix = department.getPath() + id + "/";
        return departmentRepository.findByPathStartingWith(pathPrefix);
    }

    @Override
    @Transactional
    public Department createDepartment(Department department) {
        if (department.getParentId() != null) {
            Department parent = getDepartmentById(department.getParentId());
            department.setPath(buildPath(department.getParentId()));
        } else {
            department.setPath("/");
        }

        if (departmentRepository.existsByCode(department.getCode())) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "部门编码已存在");
        }

        return departmentRepository.save(department);
    }

    @Override
    @Transactional
    public Department updateDepartment(Department department) {
        Department existing = getDepartmentById(department.getId());

        if (!existing.getCode().equals(department.getCode()) &&
                departmentRepository.existsByCode(department.getCode())) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "部门编码已存在");
        }

        existing.setName(department.getName());
        existing.setCode(department.getCode());
        existing.setDescription(department.getDescription());
        existing.setSortOrder(department.getSortOrder());
        existing.setManagerId(department.getManagerId());
        existing.setContactEmail(department.getContactEmail());
        existing.setContactPhone(department.getContactPhone());

        return departmentRepository.save(existing);
    }

    @Override
    @Transactional
    public void deleteDepartment(Long id) {
        Department department = getDepartmentById(id);

        if (departmentRepository.existsByParentId(id)) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "该部门存在子部门，无法删除");
        }

        if (userRepository.existsByDepartmentId(id)) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "该部门存在成员，无法删除");
        }

        departmentRepository.delete(department);
    }

    @Override
    @Transactional
    public Department moveDepartment(Long id, Long parentId) {
        Department department = getDepartmentById(id);

        if (id.equals(parentId)) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "不能将部门移动到自身下");
        }

        if (parentId != null) {
            Department newParent = getDepartmentById(parentId);

            if (isDescendant(id, parentId)) {
                throw new BusinessException(ResultCode.BAD_REQUEST, "不能将部门移动到其子部门下");
            }

            department.setParentId(parentId);
            department.setPath(buildPath(parentId));

            updateDescendantsPath(department);
        } else {
            department.setParentId(null);
            department.setPath("/");
        }

        return departmentRepository.save(department);
    }

    private boolean isDescendant(Long ancestorId, Long descendantId) {
        Department descendant = getDepartmentById(descendantId);
        return descendant.getPath().contains("/" + ancestorId + "/");
    }

    private void updateDescendantsPath(Department parent) {
        List<Department> descendants = departmentRepository.findByPathStartingWith(parent.getPath() + parent.getId() + "/");

        for (Department child : descendants) {
            String newPath = parent.getPath() + parent.getId() + "/" +
                    child.getPath().substring(getOldParentPath(child).length());
            child.setPath(newPath);
            departmentRepository.save(child);
        }
    }

    private String getOldParentPath(Department dept) {
        Department parent = dept.getParentId() != null ?
                getDepartmentById(dept.getParentId()) : null;
        return parent != null ? parent.getPath() + parent.getId() + "/" : "/";
    }

    @Override
    public Page<User> getDepartmentMembers(Long departmentId, Pageable pageable) {
        return userRepository.findByDepartmentId(departmentId, pageable);
    }

    @Override
    public Map<String, Object> getDepartmentStats(Long id) {
        Department department = getDepartmentById(id);

        long memberCount = userRepository.countByDepartmentId(id);
        long childCount = departmentRepository.countByParentId(id);
        long descendantCount = getDescendants(id).size();

        Map<String, Object> stats = new HashMap<>();
        stats.put("memberCount", memberCount);
        stats.put("childCount", childCount);
        stats.put("totalDescendantCount", descendantCount);
        stats.put("department", department);

        return stats;
    }

    @Override
    public List<Department> searchDepartments(String keyword) {
        return departmentRepository.findByNameContainingOrCodeContaining(keyword, keyword);
    }

    @Override
    public String buildPath(Long parentId) {
        if (parentId == null) {
            return "/";
        }
        Department parent = getDepartmentById(parentId);
        return parent.getPath() + parent.getId() + "/";
    }
}
