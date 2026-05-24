package com.company.knowledge.service.impl;

import com.company.knowledge.common.enums.OperationType;
import com.company.knowledge.common.enums.ResultCode;
import com.company.knowledge.common.exception.BusinessException;
import com.company.knowledge.common.utils.JwtUtils;
import com.company.knowledge.common.utils.PinyinUtils;
import com.company.knowledge.dto.request.RegisterRequest;
import com.company.knowledge.dto.response.LoginResponse;
import com.company.knowledge.dto.response.TokenRefreshResponse;
import com.company.knowledge.entity.User;
import com.company.knowledge.entity.OperationLog;
import com.company.knowledge.repository.UserRepository;
import com.company.knowledge.repository.OperationLogRepository;
import com.company.knowledge.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final OperationLogRepository operationLogRepository;
    private final JwtUtils jwtUtils;
    private final PasswordEncoder passwordEncoder;
    private final RedisTemplate<String, Object> redisTemplate;

    @Value("${jwt.refresh-expiration}")
    private Long refreshExpiration;

    private static final String TOKEN_BLACKLIST_PREFIX = "token:blacklist:";

    @Override
    @Transactional
    public LoginResponse login(String username, String password, String ip) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessException(ResultCode.UNAUTHORIZED, "用户名或密码错误"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "用户名或密码错误");
        }

        if (!Boolean.TRUE.equals(user.getEnabled())) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "账号已被禁用");
        }

        updateLoginInfo(user.getId(), ip);

        return generateLoginResponse(user);
    }

    @Override
    @Transactional
    public LoginResponse ldapLogin(String username, String ip) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessException(ResultCode.UNAUTHORIZED, "LDAP用户不存在，请联系管理员"));

        if (!Boolean.TRUE.equals(user.getEnabled())) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "账号已被禁用");
        }

        updateLoginInfo(user.getId(), ip);

        return generateLoginResponse(user);
    }

    @Override
    @Transactional
    public LoginResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "用户名已存在");
        }

        if (request.getEmail() != null && userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "邮箱已被使用");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRealName(request.getRealName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setEnabled(true);
        user.setIsAdmin(false);

        if (request.getRealName() != null) {
            user.setPinyin(PinyinUtils.toPinyin(request.getRealName()));
            user.setFirstLetter(PinyinUtils.toFirstLetter(request.getRealName()));
        }

        user = userRepository.save(user);

        operationLogRepository.save(OperationLog.builder()
                .userId(user.getId())
                .userName(user.getRealName())
                .operationType(OperationType.REGISTER)
                .module("认证")
                .description("用户注册成功")
                .operationTime(LocalDateTime.now())
                .ipAddress("127.0.0.1")
                .success(true)
                .build());

        return generateLoginResponse(user);
    }

    @Override
    public void logout(Long userId) {
        redisTemplate.opsForValue().set(
                TOKEN_BLACKLIST_PREFIX + userId,
                "logout",
                7,
                TimeUnit.DAYS
        );
    }

    @Override
    public LoginResponse.UserInfo getUserInfo(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ResultCode.NOT_FOUND, "用户不存在"));

        return LoginResponse.UserInfo.builder()
                .id(user.getId())
                .username(user.getUsername())
                .realName(user.getRealName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatar(user.getAvatar())
                .departmentId(user.getDepartment() != null ? user.getDepartment().getId() : null)
                .departmentName(user.getDepartment() != null ? user.getDepartment().getName() : null)
                .position(user.getPosition())
                .isAdmin(user.getIsAdmin())
                .build();
    }

    @Override
    @Transactional
    public TokenRefreshResponse refreshToken(String refreshToken) {
        if (!jwtUtils.validateToken(refreshToken)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "RefreshToken无效或已过期");
        }

        Long userId = jwtUtils.getUserIdFromToken(refreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ResultCode.NOT_FOUND, "用户不存在"));

        String newAccessToken = jwtUtils.generateToken(user.getId(), user.getUsername());
        String newRefreshToken = jwtUtils.generateRefreshToken(user.getId(), user.getUsername());

        return TokenRefreshResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .expiresIn(7200L)
                .tokenType("Bearer")
                .build();
    }

    @Override
    @Transactional
    public void updateLoginInfo(Long userId, String ip) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setLastLoginTime(LocalDateTime.now());
            user.setLastLoginIp(ip);
            user.setLoginCount(user.getLoginCount() == null ? 1 : user.getLoginCount() + 1);
            userRepository.save(user);
        });
    }

    private LoginResponse generateLoginResponse(User user) {
        String accessToken = jwtUtils.generateToken(user.getId(), user.getUsername());
        String refreshToken = jwtUtils.generateRefreshToken(user.getId(), user.getUsername());

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(7200L)
                .tokenType("Bearer")
                .userInfo(LoginResponse.UserInfo.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .realName(user.getRealName())
                        .email(user.getEmail())
                        .phone(user.getPhone())
                        .avatar(user.getAvatar())
                        .departmentId(user.getDepartment() != null ? user.getDepartment().getId() : null)
                        .departmentName(user.getDepartment() != null ? user.getDepartment().getName() : null)
                        .position(user.getPosition())
                        .isAdmin(user.getIsAdmin())
                        .build())
                .build();
    }
}
