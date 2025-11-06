package com.ticketbroker.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class ContactRequest {
    @NotBlank(message = "Namn är obligatoriskt")
    private String name;
    
    @NotBlank(message = "E-post är obligatorisk")
    @Email(message = "Ange en giltig e-postadress")
    private String email;
    
    private String phone;
    
    @NotBlank(message = "Ämne är obligatoriskt")
    private String subject;
    
    @NotBlank(message = "Meddelande är obligatoriskt")
    private String message;
    
    private boolean gdprConsent;
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getPhone() {
        return phone;
    }
    
    public void setPhone(String phone) {
        this.phone = phone;
    }
    
    public String getSubject() {
        return subject;
    }
    
    public void setSubject(String subject) {
        this.subject = subject;
    }
    
    public String getMessage() {
        return message;
    }
    
    public void setMessage(String message) {
        this.message = message;
    }
    
    public boolean isGdprConsent() {
        return gdprConsent;
    }
    
    public void setGdprConsent(boolean gdprConsent) {
        this.gdprConsent = gdprConsent;
    }
}

