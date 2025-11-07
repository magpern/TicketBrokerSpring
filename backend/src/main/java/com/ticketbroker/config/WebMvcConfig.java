package com.ticketbroker.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.NonNull;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Objects;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
    
    @Autowired
    private PayloadLoggingInterceptor payloadLoggingInterceptor;
    
    @Override
    public void addInterceptors(@NonNull InterceptorRegistry registry) {
        registry.addInterceptor(Objects.requireNonNull(payloadLoggingInterceptor, "PayloadLoggingInterceptor cannot be null"))
                .addPathPatterns("/api/**");
    }
}

