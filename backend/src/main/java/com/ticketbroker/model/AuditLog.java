package com.ticketbroker.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * AuditLog entity - no longer persisted to database.
 * Audit logs are now written to log files only (picked up by Promtail/Loki).
 * This class is kept for reference but is not managed by JPA.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {
    private Long id;
    private LocalDateTime timestamp = LocalDateTime.now();
    private String actionType; // booking_created, payment_initiated, etc.
    private String entityType; // booking, ticket, payment
    private Long entityId;
    private String userType; // buyer, admin
    private String userIdentifier; // Phone number or admin username
    private String details; // JSON string for additional context
    private String oldValue; // JSON string for before state
    private String newValue; // JSON string for after state
}

