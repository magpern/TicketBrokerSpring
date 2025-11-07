package com.ticketbroker.logging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PayloadLogger {
    private static final Logger logger = LoggerFactory.getLogger(PayloadLogger.class);
    
    public static void logRequest(String method, String uri, String queryString, String headers, String body) {
        logger.debug("REQUEST: {} {}?{} | Headers: {} | Body: {}", 
                method, uri, queryString != null ? queryString : "", headers, body != null ? body : "");
    }
    
    public static void logResponse(String method, String uri, int status, String headers, String body) {
        logger.debug("RESPONSE: {} {} | Status: {} | Headers: {} | Body: {}", 
                method, uri, status, headers, body != null ? body : "");
    }
}

