package com.ticketbroker.repository;

import com.ticketbroker.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    Optional<Booking> findByBookingReference(String bookingReference);
    
    Optional<Booking> findByBookingReferenceAndEmail(String bookingReference, String email);
    
    List<Booking> findByShowId(Long showId);
    
    List<Booking> findByStatus(String status);
    
    List<Booking> findByEmail(String email);
    
    List<Booking> findByEmailAndLastName(String email, String lastName);
    
    @Query("SELECT b FROM Booking b WHERE b.status = 'confirmed' AND b.show.id = :showId")
    List<Booking> findConfirmedBookingsByShowId(Long showId);
}

