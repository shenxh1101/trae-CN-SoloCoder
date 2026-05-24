package com.company.knowledge.service;

import com.company.knowledge.dto.request.RegisterRequest;
import com.company.knowledge.dto.response.LoginResponse;
import com.company.knowledge.dto.response.TokenRefreshResponse;

public interface AuthService {

    LoginResponse login(String username, String password, String ip);

    LoginResponse ldapLogin(String username, String ip);

    LoginResponse register(RegisterRequest request);

    void logout(Long userId);

    LoginResponse.UserInfo getUserInfo(Long userId);

    TokenRefreshResponse refreshToken(String refreshToken);

    void updateLoginInfo(Long userId, String ip);
}
