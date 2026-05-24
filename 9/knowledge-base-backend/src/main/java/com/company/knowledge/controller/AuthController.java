package com.company.knowledge.controller;

import com.company.knowledge.common.annotation.OperationLog;
import com.company.knowledge.common.enums.OperationType;
import com.company.knowledge.common.exception.Result;
import com.company.knowledge.common.utils.JwtUtils;
import com.company.knowledge.dto.request.LoginRequest;
import com.company.knowledge.dto.request.RegisterRequest;
import com.company.knowledge.dto.response.LoginResponse;
import com.company.knowledge.dto.response.TokenRefreshResponse;
import com.company.knowledge.security.CustomUserDetails;
import com.company.knowledge.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "认证管理", description = "用户登录、登出、Token管理")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtUtils jwtUtils;

    @Operation(summary = "用户登录", description = "用户名密码登录")
    @PostMapping("/login")
    public Result<LoginResponse> login(@Valid @RequestBody LoginRequest request,
                                       HttpServletRequest httpRequest) {
        String ip = getClientIp(httpRequest);
        LoginResponse response = authService.login(request.getUsername(), request.getPassword(), ip);
        return Result.success(response);
    }

    @Operation(summary = "LDAP登录", description = "LDAP单点登录")
    @PostMapping("/ldap-login")
    public Result<LoginResponse> ldapLogin(@RequestParam String username,
                                          HttpServletRequest httpRequest) {
        String ip = getClientIp(httpRequest);
        LoginResponse response = authService.ldapLogin(username, ip);
        return Result.success(response);
    }

    @Operation(summary = "用户注册", description = "新用户注册")
    @PostMapping("/register")
    @OperationLog(module = "认证", type = OperationType.REGISTER)
    public Result<LoginResponse> register(@Valid @RequestBody RegisterRequest request) {
        LoginResponse response = authService.register(request);
        return Result.success(response);
    }

    @Operation(summary = "用户登出", description = "退出登录")
    @PostMapping("/logout")
    @OperationLog(module = "认证", type = OperationType.LOGOUT)
    public Result<Void> logout(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails != null) {
            authService.logout(userDetails.getUserId());
        }
        return Result.success();
    }

    @Operation(summary = "获取当前用户信息", description = "获取登录用户详情")
    @GetMapping("/user-info")
    public Result<LoginResponse.UserInfo> getUserInfo(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return Result.error("用户未登录");
        }
        LoginResponse.UserInfo userInfo = authService.getUserInfo(userDetails.getUserId());
        return Result.success(userInfo);
    }

    @Operation(summary = "刷新Token", description = "使用RefreshToken刷新访问令牌")
    @PostMapping("/refresh-token")
    public Result<TokenRefreshResponse> refreshToken(@RequestParam String refreshToken) {
        TokenRefreshResponse response = authService.refreshToken(refreshToken);
        return Result.success(response);
    }

    @Operation(summary = "验证Token", description = "验证Token是否有效")
    @GetMapping("/validate")
    public Result<Boolean> validateToken(@RequestParam String token) {
        boolean valid = jwtUtils.validateToken(token);
        return Result.success(valid);
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}
