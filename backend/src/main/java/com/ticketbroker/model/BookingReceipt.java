package com.ticketbroker.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "booking_receipts")
@Data
@NoArgsConstructor
public class BookingReceipt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Plain id rather than a relation: the image should never be loaded along with a booking
    @Column(name = "booking_id", nullable = false, unique = true)
    private Long bookingId;

    @Column(nullable = false, length = 50)
    private String contentType;

    @Column(nullable = false)
    private byte[] imageData;

    @Column(nullable = false)
    private LocalDateTime uploadedAt;
}
