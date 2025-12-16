package com.ticketbroker.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class BookingRequest {
    @NotNull(message = "Show ID is required")
    private Long showId;

    @NotBlank(message = "First name is required")
    @Size(max = 50, message = "First name must be less than 50 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(max = 50, message = "Last name must be less than 50 characters")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    @Size(max = 120, message = "Email must be less than 120 characters")
    private String email;

    @NotBlank(message = "Phone is required")
    @Size(max = 20, message = "Phone must be less than 20 characters")
    private String phone;

    @Min(value = 0, message = "Adult tickets cannot be negative")
    private Integer adultTickets = 0;

    @Min(value = 0, message = "Student tickets cannot be negative")
    private Integer studentTickets = 0;
}
