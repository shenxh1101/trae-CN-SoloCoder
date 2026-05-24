package com.company.knowledge.controller;

import com.company.knowledge.common.annotation.OperationLog;
import com.company.knowledge.common.enums.OperationType;
import com.company.knowledge.common.exception.Result;
import com.company.knowledge.entity.Department;
import com.company.knowledge.entity.User;
import com.company.knowledge.service.DepartmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "部门管理", description = "部门CRUD操作")
@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentService departmentService;

    @Operation(summary = "获取部门树", description = "获取完整的部门树形结构")
    @GetMapping("/tree")
    public Result<List<Department>> getTree() {
        List<Department> tree = departmentService.getDepartmentTree();
        return Result.success(tree);
    }

    @Operation(summary = "获取部门列表", description = "分页获取部门列表")
    @GetMapping
    public Result<Page<Department>> list(
            @Parameter(description = "页码") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "每页数量") @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Department> departments = departmentService.listDepartments(pageable);
        return Result.success(departments);
    }

    @Operation(summary = "获取部门详情", description = "根据ID获取部门详情")
    @GetMapping("/{id}")
    public Result<Department> getById(@PathVariable Long id) {
        Department department = departmentService.getDepartmentById(id);
        return Result.success(department);
    }

    @Operation(summary = "获取下级部门", description = "获取指定部门的直接下级部门")
    @GetMapping("/{id}/children")
    public Result<List<Department>> getChildren(@PathVariable Long id) {
        List<Department> children = departmentService.getChildren(id);
        return Result.success(children);
    }

    @Operation(summary = "获取所有后代部门", description = "获取指定部门的所有后代部门")
    @GetMapping("/{id}/descendants")
    public Result<List<Department>> getDescendants(@PathVariable Long id) {
        List<Department> descendants = departmentService.getDescendants(id);
        return Result.success(descendants);
    }

    @Operation(summary = "创建部门", description = "创建新部门")
    @PostMapping
    @OperationLog(module = "部门管理", type = OperationType.CREATE)
    public Result<Department> create(@RequestBody Department department) {
        Department created = departmentService.createDepartment(department);
        return Result.success(created);
    }

    @Operation(summary = "更新部门", description = "更新部门信息")
    @PutMapping("/{id}")
    @OperationLog(module = "部门管理", type = OperationType.UPDATE)
    public Result<Department> update(@PathVariable Long id, @RequestBody Department department) {
        department.setId(id);
        Department updated = departmentService.updateDepartment(department);
        return Result.success(updated);
    }

    @Operation(summary = "删除部门", description = "删除部门（如果有子部门或成员则不能删除）")
    @DeleteMapping("/{id}")
    @OperationLog(module = "部门管理", type = OperationType.DELETE)
    public Result<Void> delete(@PathVariable Long id) {
        departmentService.deleteDepartment(id);
        return Result.success();
    }

    @Operation(summary = "移动部门", description = "移动部门到新的父部门")
    @PutMapping("/{id}/move")
    @OperationLog(module = "部门管理", type = OperationType.MOVE)
    public Result<Department> move(@PathVariable Long id, @RequestParam Long parentId) {
        Department moved = departmentService.moveDepartment(id, parentId);
        return Result.success(moved);
    }

    @Operation(summary = "获取部门成员", description = "获取部门的成员列表")
    @GetMapping("/{id}/members")
    public Result<Page<User>> getMembers(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<User> members = departmentService.getDepartmentMembers(id, pageable);
        return Result.success(members);
    }

    @Operation(summary = "获取部门成员数量", description = "获取部门的成员数量统计")
    @GetMapping("/{id}/stats")
    public Result<Map<String, Object>> getStats(@PathVariable Long id) {
        Map<String, Object> stats = departmentService.getDepartmentStats(id);
        return Result.success(stats);
    }

    @Operation(summary = "搜索部门", description = "根据关键词搜索部门")
    @GetMapping("/search")
    public Result<List<Department>> search(@RequestParam String keyword) {
        List<Department> departments = departmentService.searchDepartments(keyword);
        return Result.success(departments);
    }
}
