package com.ticketbroker.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.ticketbroker.model.Booking;
import com.ticketbroker.model.Ticket;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class AuditService {
    private static final Logger auditLogger = LoggerFactory.getLogger(AuditService.class);
    private final ObjectMapper objectMapper;
    
    public AuditService() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }
    
    public void logAuditEvent(String actionType, String entityType, Long entityId,
                             String userType, String userIdentifier,
                             Map<String, Object> details, Map<String, Object> oldValue,
                             Map<String, Object> newValue) {
        try {
            // Log to audit log file (Promtail will pick this up and send to Loki)
            String detailsJson = details != null ? objectMapper.writeValueAsString(details) : null;
            String oldValueJson = oldValue != null ? objectMapper.writeValueAsString(oldValue) : null;
            String newValueJson = newValue != null ? objectMapper.writeValueAsString(newValue) : null;
            
            auditLogger.info("AUDIT: action={}, entity={}, entityId={}, userType={}, userIdentifier={}, details={}, oldValue={}, newValue={}",
                    actionType, entityType, entityId, userType, userIdentifier, detailsJson, oldValueJson, newValueJson);
        } catch (JsonProcessingException e) {
            // If JSON serialization fails, log without JSON formatting
            auditLogger.warn("AUDIT: action={}, entity={}, entityId={}, userType={}, userIdentifier={} (JSON serialization failed: {})",
                    actionType, entityType, entityId, userType, userIdentifier, e.getMessage());
        }
    }
    
    public void logBookingCreated(Booking booking) {
        Map<String, Object> details = new HashMap<>();
        details.put("bookingReference", booking.getBookingReference());
        details.put("showTime", booking.getShow().getStartTime() + "-" + booking.getShow().getEndTime());
        details.put("adultTickets", booking.getAdultTickets());
        details.put("studentTickets", booking.getStudentTickets());
        details.put("totalAmount", booking.getTotalAmount());
        
        logAuditEvent("booking_created", "booking", booking.getId(),
                "buyer", booking.getPhone(), details, null, null);
    }
    
    public void logPaymentInitiated(Booking booking) {
        Map<String, Object> details = new HashMap<>();
        details.put("bookingReference", booking.getBookingReference());
        details.put("amount", booking.getTotalAmount());
        details.put("initiatedAt", booking.getSwishPaymentInitiatedAt());
        
        logAuditEvent("payment_initiated", "booking", booking.getId(),
                "buyer", booking.getPhone(), details, null, null);
    }
    
    public void logPaymentConfirmed(Booking booking, String adminUser) {
        Map<String, Object> details = new HashMap<>();
        details.put("bookingReference", booking.getBookingReference());
        details.put("amount", booking.getTotalAmount());
        details.put("confirmedAt", booking.getConfirmedAt());
        
        logAuditEvent("payment_confirmed", "booking", booking.getId(),
                "admin", adminUser, details, null, null);
    }
    
    public void logTicketGenerated(Ticket ticket, Booking booking) {
        Map<String, Object> details = new HashMap<>();
        details.put("ticketReference", ticket.getTicketReference());
        details.put("ticketType", ticket.getTicketType());
        details.put("bookingReference", booking.getBookingReference());
        
        logAuditEvent("ticket_generated", "ticket", ticket.getId(),
                "admin", "system", details, null, null);
    }
    
    public void logTicketUsed(Ticket ticket, String checkerUser) {
        Map<String, Object> details = new HashMap<>();
        details.put("ticketReference", ticket.getTicketReference());
        details.put("usedAt", ticket.getUsedAt());
        
        logAuditEvent("ticket_used", "ticket", ticket.getId(),
                "admin", checkerUser, details, null, null);
    }
    
    public void logTicketDeleted(Ticket ticket, String adminUser, String reason) {
        Map<String, Object> details = new HashMap<>();
        details.put("ticketReference", ticket.getTicketReference());
        details.put("ticketType", ticket.getTicketType());
        details.put("reason", reason);
        
        logAuditEvent("ticket_deleted", "ticket", ticket.getId(),
                "admin", adminUser, details, null, null);
    }
    
    public void logSettingsChanged(String key, String oldValue, String newValue, String adminUser) {
        Map<String, Object> oldVal = new HashMap<>();
        oldVal.put("value", oldValue);
        Map<String, Object> newVal = new HashMap<>();
        newVal.put("value", newValue);
        Map<String, Object> details = new HashMap<>();
        details.put("settingKey", key);
        
        logAuditEvent("settings_changed", "settings", 0L,
                "admin", adminUser, details, oldVal, newVal);
    }
    
    public void logBuyerConfirmedPayment(Booking booking) {
        Map<String, Object> details = new HashMap<>();
        details.put("bookingReference", booking.getBookingReference());
        details.put("amount", booking.getTotalAmount());
        
        logAuditEvent("buyer_payment_confirmed", "booking", booking.getId(),
                "buyer", booking.getPhone(), details, null, null);
    }
    
    public void logBookingUpdated(Booking booking, Map<String, Object> changedFields, String adminUser) {
        Map<String, Object> details = new HashMap<>();
        details.put("bookingReference", booking.getBookingReference());
        
        Map<String, Object> oldValue = new HashMap<>();
        Map<String, Object> newValue = new HashMap<>();
        
        // Track all changed fields
        for (Map.Entry<String, Object> entry : changedFields.entrySet()) {
            String field = entry.getKey();
            Object value = entry.getValue();
            
            // Store old and new values
            if (value instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> valueMap = (Map<String, Object>) value;
                oldValue.put(field, valueMap.get("old"));
                newValue.put(field, valueMap.get("new"));
            } else {
                newValue.put(field, value);
            }
        }
        
        logAuditEvent("booking_updated", "booking", booking.getId(),
                "admin", adminUser, details, oldValue.isEmpty() ? null : oldValue, 
                newValue.isEmpty() ? null : newValue);
    }
    
}

