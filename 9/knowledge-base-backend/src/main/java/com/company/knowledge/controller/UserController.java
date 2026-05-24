package com.company.knowledge.controller;

import com.company.knowledge.common.annotation.OperationLog;
import com.company.knowledge.common.enums.OperationType;
import com.company.knowledge.common.exception.Result;
import com.company.knowledge.entity.User;
import com.company.knowledge.repository.UserRepository;
import com.company.knowledge.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "用户管理", description = "用户CRUD操作")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;

    @Operation(summary = "获取用户列表", description = "分页获取用户列表")
    @GetMapping
    public Result<Page<User>> list(
            @Parameter(description = "页码") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "每页数量") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "搜索关键词") @RequestParam(required = false) String keyword,
            @Parameter(description = "部门ID") @RequestParam(required = false) Long departmentId,
            @Parameter(description = "是否启用") @RequestParam(required = false) Boolean enabled,
            @Parameter(description = "排序字段") @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "排序方向") @RequestParam(defaultValue = "desc") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("asc") ?
                Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<User> users = userService.listUsers(keyword, departmentId, enabled, pageable);
        return Result.success(users);
    }

    @Operation(summary = "获取用户详情", description = "根据ID获取用户详情")
    @GetMapping("/{id}")
    public Result<User> getById(@PathVariable Long id) {
        User user = userService.getUserById(id);
        return Result.success(user);
    }

    @Operation(summary = "获取当前用户详情", description = "获取当前登录用户详情")
    @GetMapping("/me")
    public Result<User> getCurrentUser() {
        User user = userService.getCurrentUser();
        return Result.success(user);
    }

    @Operation(summary = "创建用户", description = "创建新用户")
    @PostMapping
    @OperationLog(module = "用户管理", type = OperationType.CREATE)
    public Result<User> create(@RequestBody User user) {
        User created = userService.createUser(user);
        return Result.success(created);
    }

    @Operation(summary = "更新用户", description = "更新用户信息")
    @PutMapping("/{id}")
    @OperationLog(module = "用户管理", type = OperationType.UPDATE)
    public Result<User> update(@PathVariable Long id, @RequestBody User user) {
        user.setId(id);
        User updated = userService.updateUser(user);
        return Result.success(updated);
    }

    @Operation(summary = "删除用户", description = "删除用户（软删除）")
    @DeleteMapping("/{id}")
    @OperationLog(module = "用户管理", type = OperationType.DELETE)
    public Result<Void> delete(@PathVariable Long id) {
        userService.deleteUser(id);
        return Result.success();
    }

    @Operation(summary = "修改密码", description = "修改用户密码")
    @PutMapping("/{id}/password")
    @OperationLog(module = "用户管理", type = OperationType.UPDATE_PASSWORD)
    public Result<Void> changePassword(
            @PathVariable Long id,
            @RequestParam String oldPassword,
            @RequestParam String newPassword) {
        userService.changePassword(id, oldPassword, newPassword);
        return Result.success();
    }

    @Operation(summary = "重置密码", description = "管理员重置用户密码")
    @PutMapping("/{id}/reset-password")
    @OperationLog(module = "用户管理", type = OperationType.RESET_PASSWORD)
    public Result<String> resetPassword(@PathVariable Long id) {
        String newPassword = userService.resetPassword(id);
        return Result.success(newPassword);
    }

    @Operation(summary = "修改用户状态", description = "启用/禁用用户")
    @PutMapping("/{id}/status")
    @OperationLog(module = "用户管理", type = OperationType.UPDATE_STATUS)
    public Result<Void> changeStatus(
            @PathVariable Long id,
            @RequestParam Boolean enabled) {
        userService.changeUserStatus(id, enabled);
        return Result.success();
    }

    @Operation(summary = "修改个人信息", description = "当前用户修改个人信息")
    @PutMapping("/profile")
    @OperationLog(module = "用户管理", type = OperationType.UPDATE_PROFILE)
    public Result<User> updateProfile(@RequestBody User user) {
        User updated = userService.updateProfile(user);
        return Result.success(updated);
    }

    @Operation(summary = "修改头像", description = "上传并修改头像")
    @PostMapping("/avatar")
    @OperationLog(module = "用户管理", type = OperationType.UPDATE_AVATAR)
    public Result<String> updateAvatar(@RequestParam("file") MultipartFile file) {
        String avatarUrl = userService.updateAvatar(file);
        return Result.success(avatarUrl);
    }

    @Operation(summary = "检查用户名是否存在", description = "检查用户名是否可用")
    @GetMapping("/check/username")
    public Result<Boolean> checkUsername(@RequestParam String username) {
        boolean exists = userRepository.existsByUsername(username);
        return Result.success(!exists);
    }

    @Operation(summary = "检查邮箱是否存在", description = "检查邮箱是否可用")
    @GetMapping("/check/email")
    public Result<Boolean> checkEmail(@RequestParam String email) {
        boolean exists = userRepository.existsByEmail(email);
        return Result.success(!exists);
    }

    @Operation(summary = "获取所有启用用户", description = "获取所有启用的用户列表")
    @GetMapping("/all/enabled")
    public Result<Page<User>> getAllEnabledUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<User> users = userService.getAllEnabledUsers(pageable);
        return Result.success(users);
    }
}
