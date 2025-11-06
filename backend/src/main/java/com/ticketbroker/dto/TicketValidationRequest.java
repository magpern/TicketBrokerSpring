package com.ticketbroker.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TicketValidationRequest {
    @NotBlank(message = "Ticket reference is required")
    private String ticketReference;
    
    private Long showId; // Optional: to validate ticket is for correct show
}

