package com.company.knowledge.service.impl;

import com.company.knowledge.common.enums.ResultCode;
import com.company.knowledge.common.exception.BusinessException;
import com.company.knowledge.common.utils.PinyinUtils;
import com.company.knowledge.common.utils.SecurityUtils;
import com.company.knowledge.entity.User;
import com.company.knowledge.repository.UserRepository;
import com.company.knowledge.service.FileStorageService;
import com.company.knowledge.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final FileStorageService fileStorageService;

    @Override
    public Page<User> listUsers(String keyword, Long departmentId, Boolean enabled, Pageable pageable) {
        return userRepository.findByConditions(keyword, departmentId, enabled, pageable);
    }

    @Override
    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ResultCode.NOT_FOUND, "用户不存在"));
    }

    @Override
    public User getCurrentUser() {
        Long userId = SecurityUtils.getCurrentUserId();
        return getUserById(userId);
    }

    @Override
    @Transactional
    public User createUser(User user) {
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "用户名已存在");
        }

        if (user.getEmail() != null && userRepository.existsByEmail(user.getEmail())) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "邮箱已被使用");
        }

        if (user.getPassword() == null || user.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode("123456"));
        } else {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }

        if (user.getRealName() != null) {
            user.setPinyin(PinyinUtils.toPinyin(user.getRealName()));
            user.setFirstLetter(PinyinUtils.toFirstLetter(user.getRealName()));
        }

        user.setEnabled(true);
        user.setIsAdmin(false);
        user.setLoginCount(0);

        return userRepository.save(user);
    }

    @Override
    @Transactional
    public User updateUser(User user) {
        User existing = getUserById(user.getId());

        if (user.getRealName() != null && !user.getRealName().equals(existing.getRealName())) {
            user.setPinyin(PinyinUtils.toPinyin(user.getRealName()));
            user.setFirstLetter(PinyinUtils.toFirstLetter(user.getRealName()));
        }

        if (user.getPassword() != null && !user.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        } else {
            user.setPassword(existing.getPassword());
        }

        return userRepository.save(user);
    }

    @Override
    @Transactional
    public void deleteUser(Long id) {
        User user = getUserById(id);

        if (Boolean.TRUE.equals(user.getIsAdmin())) {
            throw new BusinessException(ResultCode.FORBIDDEN, "不能删除管理员账号");
        }

        user.setEnabled(false);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void changePassword(Long id, String oldPassword, String newPassword) {
        User user = getUserById(id);
        Long currentUserId = SecurityUtils.getCurrentUserId();

        if (!id.equals(currentUserId)) {
            throw new BusinessException(ResultCode.FORBIDDEN, "只能修改自己的密码");
        }

        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "原密码错误");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Override
    @Transactional
    public String resetPassword(Long id) {
        User user = getUserById(id);
        String newPassword = UUID.randomUUID().toString().substring(0, 8);
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return newPassword;
    }

    @Override
    @Transactional
    public void changeUserStatus(Long id, Boolean enabled) {
        User user = getUserById(id);

        if (Boolean.TRUE.equals(user.getIsAdmin()) && !enabled) {
            throw new BusinessException(ResultCode.FORBIDDEN, "不能禁用管理员账号");
        }

        user.setEnabled(enabled);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public User updateProfile(User user) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = getUserById(currentUserId);

        if (user.getRealName() != null) {
            currentUser.setRealName(user.getRealName());
            currentUser.setPinyin(PinyinUtils.toPinyin(user.getRealName()));
            currentUser.setFirstLetter(PinyinUtils.toFirstLetter(user.getRealName()));
        }

        if (user.getEmail() != null) {
            if (!user.getEmail().equals(currentUser.getEmail()) &&
                    userRepository.existsByEmail(user.getEmail())) {
                throw new BusinessException(ResultCode.BAD_REQUEST, "邮箱已被使用");
            }
            currentUser.setEmail(user.getEmail());
        }

        if (user.getPhone() != null) {
            currentUser.setPhone(user.getPhone());
        }

        if (user.getPosition() != null) {
            currentUser.setPosition(user.getPosition());
        }

        return userRepository.save(currentUser);
    }

    @Override
    @Transactional
    public String updateAvatar(MultipartFile file) {
        Long userId = SecurityUtils.getCurrentUserId();
        User user = getUserById(userId);

        String avatarUrl = fileStorageService.uploadFile(file, "avatar");

        user.setAvatar(avatarUrl);
        userRepository.save(user);

        return avatarUrl;
    }

    @Override
    public Page<User> getAllEnabledUsers(Pageable pageable) {
        return userRepository.findByEnabledTrue(pageable);
    }
}
