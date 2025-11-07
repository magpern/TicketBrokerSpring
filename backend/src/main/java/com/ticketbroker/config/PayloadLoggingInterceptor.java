package com.ticketbroker.config;

import com.ticketbroker.logging.PayloadLogger;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.stream.Collectors;

@Component
public class PayloadLoggingInterceptor implements HandlerInterceptor {
    private static final Logger logger = LoggerFactory.getLogger(PayloadLoggingInterceptor.class);
    
    // Exclude sensitive endpoints from payload logging
    private static final String[] EXCLUDED_PATHS = {
        "/api/admin/login",
        "/api/admin/settings"
    };
    
    @Override
    public boolean preHandle(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull Object handler) {
        // Skip payload logging for excluded paths
        String requestURI = request.getRequestURI();
        for (String excludedPath : EXCLUDED_PATHS) {
            if (requestURI.startsWith(excludedPath)) {
                return true;
            }
        }
        
        // Only log API endpoints
        if (!requestURI.startsWith("/api/")) {
            return true;
        }
        
        try {
            String method = request.getMethod();
            String uri = request.getRequestURI();
            String queryString = request.getQueryString();
            
            // Get headers
            String headers = Collections.list(request.getHeaderNames()).stream()
                    .map(name -> name + ": " + request.getHeader(name))
                    .collect(Collectors.joining(", "));
            
            // Get request body if available
            String body = "";
            if (request instanceof ContentCachingRequestWrapper) {
                ContentCachingRequestWrapper wrappedRequest = (ContentCachingRequestWrapper) request;
                byte[] content = wrappedRequest.getContentAsByteArray();
                if (content.length > 0) {
                    body = new String(content, StandardCharsets.UTF_8);
                }
            }
            
            PayloadLogger.logRequest(method, uri, queryString, headers, body);
        } catch (Exception e) {
            logger.warn("Failed to log request payload: {}", e.getMessage());
        }
        
        return true;
    }
    
    @Override
    public void afterCompletion(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull Object handler, @Nullable Exception ex) {
        // Skip payload logging for excluded paths
        String requestURI = request.getRequestURI();
        for (String excludedPath : EXCLUDED_PATHS) {
            if (requestURI.startsWith(excludedPath)) {
                return;
            }
        }
        
        // Only log API endpoints
        if (!requestURI.startsWith("/api/")) {
            return;
        }
        
        try {
            String method = request.getMethod();
            String uri = request.getRequestURI();
            int status = response.getStatus();
            
            // Get response headers
            String headers = response.getHeaderNames().stream()
                    .map(name -> name + ": " + response.getHeader(name))
                    .collect(Collectors.joining(", "));
            
            // Get response body if available
            String body = "";
            if (response instanceof ContentCachingResponseWrapper) {
                ContentCachingResponseWrapper wrappedResponse = (ContentCachingResponseWrapper) response;
                byte[] content = wrappedResponse.getContentAsByteArray();
                if (content.length > 0) {
                    body = new String(content, StandardCharsets.UTF_8);
                }
            }
            
            PayloadLogger.logResponse(method, uri, status, headers, body);
        } catch (Exception e) {
            logger.warn("Failed to log response payload: {}", e.getMessage());
        }
    }
}

