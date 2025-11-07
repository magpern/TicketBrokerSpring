package com.ticketbroker.dto;

import com.ticketbroker.model.Booking;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class BookingResponse {
    private Long id;
    private String bookingReference;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private Integer adultTickets;
    private Integer studentTickets;
    private Integer totalAmount;
    private String status;
    private Boolean buyerConfirmedPayment;
    private Boolean swishPaymentInitiated;
    private LocalDateTime swishPaymentInitiatedAt;
    private LocalDateTime createdAt;
    private LocalDateTime confirmedAt;
    private ShowResponse show;
    
    public static BookingResponse fromEntity(Booking booking) {
        BookingResponse response = new BookingResponse();
        response.setId(booking.getId());
        response.setBookingReference(booking.getBookingReference());
        response.setFirstName(booking.getFirstName());
        response.setLastName(booking.getLastName());
        response.setEmail(booking.getEmail());
        response.setPhone(booking.getPhone());
        response.setAdultTickets(booking.getAdultTickets());
        response.setStudentTickets(booking.getStudentTickets());
        response.setTotalAmount(booking.getTotalAmount());
        response.setStatus(booking.getStatus() != null ? booking.getStatus().name().toLowerCase() : null);
        response.setBuyerConfirmedPayment(booking.getBuyerConfirmedPayment());
        response.setSwishPaymentInitiated(booking.getSwishPaymentInitiated());
        response.setSwishPaymentInitiatedAt(booking.getSwishPaymentInitiatedAt());
        response.setCreatedAt(booking.getCreatedAt());
        response.setConfirmedAt(booking.getConfirmedAt());
        response.setShow(ShowResponse.fromEntity(booking.getShow()));
        return response;
    }
}

