package com.ticketbroker.repository;

import com.ticketbroker.model.BookingReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BookingReceiptRepository extends JpaRepository<BookingReceipt, Long> {
    Optional<BookingReceipt> findByBookingId(Long bookingId);
}
