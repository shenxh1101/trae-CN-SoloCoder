package com.company.knowledge.config;

import com.company.knowledge.common.utils.SecurityUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;

import java.util.Optional;

@Configuration
public class JpaAuditorConfig {

    @Bean
    public AuditorAware<Long> auditorProvider() {
        return () -> {
            try {
                return Optional.of(SecurityUtils.getCurrentUserId());
            } catch (Exception e) {
                return Optional.empty();
            }
        };
    }
}
