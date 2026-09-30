package com.ticketbroker.repository;

import com.ticketbroker.model.Booking;
import com.ticketbroker.model.BookingStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    // Row lock (SELECT ... FOR UPDATE) so concurrent confirmations of the same booking are serialized
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Booking b WHERE b.id = :id")
    Optional<Booking> findByIdForUpdate(Long id);
    
    Optional<Booking> findByBookingReference(String bookingReference);
    
    Optional<Booking> findByBookingReferenceAndEmail(String bookingReference, String email);
    
    List<Booking> findByShowId(Long showId);
    
    List<Booking> findByStatus(BookingStatus status);
    
    List<Booking> findByEmail(String email);
    
    List<Booking> findByEmailAndLastName(String email, String lastName);
    
    @Query("SELECT b FROM Booking b WHERE b.status = com.ticketbroker.model.BookingStatus.CONFIRMED AND b.show.id = :showId")
    List<Booking> findConfirmedBookingsByShowId(Long showId);
}

