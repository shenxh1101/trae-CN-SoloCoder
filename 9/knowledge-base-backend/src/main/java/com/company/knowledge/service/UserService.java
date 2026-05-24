package com.company.knowledge.service;

import com.company.knowledge.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

public interface UserService {

    Page<User> listUsers(String keyword, Long departmentId, Boolean enabled, Pageable pageable);

    User getUserById(Long id);

    User getCurrentUser();

    User createUser(User user);

    User updateUser(User user);

    void deleteUser(Long id);

    void changePassword(Long id, String oldPassword, String newPassword);

    String resetPassword(Long id);

    void changeUserStatus(Long id, Boolean enabled);

    User updateProfile(User user);

    String updateAvatar(MultipartFile file);

    Page<User> getAllEnabledUsers(Pageable pageable);
}
