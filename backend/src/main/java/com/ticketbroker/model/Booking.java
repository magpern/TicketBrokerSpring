package com.ticketbroker.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Booking {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "show_id", nullable = false)
    private Show show;
    
    @Column(nullable = false, unique = true, length = 10)
    private String bookingReference;
    
    @Column(nullable = false, length = 50)
    private String firstName;
    
    @Column(nullable = false, length = 50)
    private String lastName;
    
    @Column(nullable = false, length = 120)
    private String email;
    
    @Column(nullable = false, length = 20)
    private String phone;
    
    @Column(nullable = false)
    private Integer adultTickets = 0;
    
    @Column(nullable = false)
    private Integer studentTickets = 0;
    
    @Column(nullable = false)
    private Integer totalAmount; // Amount in SEK
    
    @Convert(converter = BookingStatusConverter.class)
    @Column(nullable = false, length = 20)
    private BookingStatus status = BookingStatus.RESERVED;
    
    @Column(nullable = false)
    private Boolean buyerConfirmedPayment = false;
    
    @Column(nullable = false)
    private Boolean swishPaymentInitiated = false;
    
    private LocalDateTime swishPaymentInitiatedAt;
    
    @Column(nullable = false)
    private Boolean gdprConsent = false;
    
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    
    private LocalDateTime confirmedAt;
    
    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<Ticket> tickets = new java.util.ArrayList<>();
    
    public Integer getTotalTickets() {
        return adultTickets + studentTickets;
    }
    
    public String getFullName() {
        return firstName + " " + lastName;
    }
}

