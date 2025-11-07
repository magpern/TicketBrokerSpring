package com.ticketbroker.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Base64;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf
                .ignoringRequestMatchers("/api/**") // Disable CSRF for all API endpoints (using stateless Basic Auth)
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").authenticated()
                .anyRequest().permitAll()
            )
            .httpBasic(httpBasic -> {}) // Enable HTTP Basic Authentication
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .addFilterBefore(new AuthenticationLoggingFilter(), BasicAuthenticationFilter.class);
        
        return http.build();
    }
    
    // Filter to log authentication attempts
    private static class AuthenticationLoggingFilter extends OncePerRequestFilter {
        private static final Logger securityLogger = LoggerFactory.getLogger(SecurityConfig.class);
        
        @Override
        protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, 
                                       @NonNull FilterChain filterChain) throws ServletException, IOException {
            String authHeader = request.getHeader("Authorization");
            
            if (authHeader != null && authHeader.startsWith("Basic ")) {
                try {
                    String base64Credentials = authHeader.substring("Basic ".length());
                    String credentials = new String(Base64.getDecoder().decode(base64Credentials));
                    String[] parts = credentials.split(":", 2);
                    
                    if (parts.length == 2) {
                        String username = parts[0];
                        securityLogger.info("Admin login attempt - Username: {}, IP: {}", username, request.getRemoteAddr());
                    }
                } catch (Exception e) {
                    securityLogger.warn("Failed to parse authentication header: {}", e.getMessage());
                }
            }
            
            filterChain.doFilter(request, response);
            
            // Log authentication result
            if (request.getRequestURI().startsWith("/api/admin/")) {
                if (response.getStatus() == 401) {
                    securityLogger.warn("Admin authentication failed - IP: {}, URI: {}", 
                               request.getRemoteAddr(), request.getRequestURI());
                } else if (response.getStatus() == 200 || response.getStatus() == 201) {
                    securityLogger.info("Admin authentication successful - IP: {}, URI: {}", 
                               request.getRemoteAddr(), request.getRequestURI());
                }
            }
        }
    }
}

