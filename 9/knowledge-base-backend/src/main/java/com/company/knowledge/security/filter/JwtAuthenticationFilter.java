package com.company.knowledge.security.filter;

import com.company.knowledge.common.utils.JwtUtils;
import com.company.knowledge.security.CustomUserDetails;
import com.company.knowledge.security.jwt.JwtAuthenticationToken;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;

    @Value("${jwt.header}")
    private String tokenHeader;

    @Value("${jwt.prefix}")
    private String tokenPrefix;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader(tokenHeader);

        if (StringUtils.isBlank(authHeader) || !authHeader.startsWith(tokenPrefix)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(tokenPrefix.length());

        try {
            if (jwtUtils.validateToken(token)) {
                Claims claims = jwtUtils.parseToken(token);
                Long userId = claims.get("userId", Long.class);
                String username = claims.getSubject();

                CustomUserDetails userDetails = new CustomUserDetails(
                        userId,
                        username,
                        null,
                        null,
                        null,
                        null,
                        true,
                        new ArrayList<>()
                );

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception e) {
            log.warn("JWT token validation failed: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}
