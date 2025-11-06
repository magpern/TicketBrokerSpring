package com.ticketbroker.repository;

import com.ticketbroker.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findAllByOrderByTimestampDesc(Pageable pageable);
    
    Page<AuditLog> findByActionTypeOrderByTimestampDesc(String actionType, Pageable pageable);
    
    Page<AuditLog> findByEntityTypeOrderByTimestampDesc(String entityType, Pageable pageable);
    
    Page<AuditLog> findByUserIdentifierOrderByTimestampDesc(String userIdentifier, Pageable pageable);
    
    Page<AuditLog> findByActionTypeAndEntityTypeOrderByTimestampDesc(String actionType, String entityType, Pageable pageable);
    
    List<AuditLog> findByEntityTypeAndEntityId(String entityType, Long entityId);
    
    List<AuditLog> findByActionType(String actionType);
    
    List<AuditLog> findByTimestampBetween(LocalDateTime start, LocalDateTime end);
    
    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT a.actionType FROM AuditLog a")
    List<String> findDistinctActionTypes();
    
    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT a.entityType FROM AuditLog a")
    List<String> findDistinctEntityTypes();
    
    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT a.userIdentifier FROM AuditLog a")
    List<String> findDistinctUserIdentifiers();
}

