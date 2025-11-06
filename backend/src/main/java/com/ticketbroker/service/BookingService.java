package com.ticketbroker.service;

import com.ticketbroker.model.Booking;
import com.ticketbroker.model.Show;
import com.ticketbroker.repository.BookingRepository;
import com.ticketbroker.repository.ShowRepository;
import com.ticketbroker.util.BookingReferenceGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class BookingService {
    private final BookingRepository bookingRepository;
    private final ShowRepository showRepository;
    private final BookingReferenceGenerator bookingReferenceGenerator;
    private final AuditService auditService;
    private final TicketService ticketService;
    
    public BookingService(BookingRepository bookingRepository, ShowRepository showRepository,
                         BookingReferenceGenerator bookingReferenceGenerator,
                         AuditService auditService, TicketService ticketService) {
        this.bookingRepository = bookingRepository;
        this.showRepository = showRepository;
        this.bookingReferenceGenerator = bookingReferenceGenerator;
        this.auditService = auditService;
        this.ticketService = ticketService;
    }
    
    @Transactional
    public Booking createBooking(Booking booking) {
        Show show = showRepository.findById(booking.getShow().getId())
                .orElseThrow(() -> new IllegalArgumentException("Show not found"));
        
        // Check availability
        if (show.getAvailableTickets() < booking.getTotalTickets()) {
            throw new IllegalArgumentException("Not enough tickets available");
        }
        
        // Generate booking reference
        booking.setBookingReference(bookingReferenceGenerator.generateUniqueReference());
        booking.setStatus("reserved");
        booking.setCreatedAt(LocalDateTime.now());
        booking.setShow(show);
        
        Booking saved = bookingRepository.save(booking);
        
        // Log booking creation
        auditService.logBookingCreated(saved);
        
        return saved;
    }
    
    public Optional<Booking> findByReference(String bookingReference) {
        return bookingRepository.findByBookingReference(bookingReference);
    }
    
    public Optional<Booking> findByReferenceAndEmail(String bookingReference, String email) {
        return bookingRepository.findByBookingReferenceAndEmail(bookingReference, email);
    }
    
    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }
    
    public List<Booking> getBookingsByShow(Long showId) {
        return bookingRepository.findByShowId(showId);
    }
    
    public List<Booking> getBookingsByStatus(String status) {
        return bookingRepository.findByStatus(status);
    }
    
    public List<Booking> getBookingsByEmail(String email) {
        return bookingRepository.findByEmail(email);
    }
    
    public List<Booking> getBookingsByEmailAndLastName(String email, String lastName) {
        return bookingRepository.findByEmailAndLastName(email.toLowerCase(), lastName);
    }
    
    @Transactional
    public void initiatePayment(Booking booking) {
        booking.setSwishPaymentInitiated(true);
        booking.setSwishPaymentInitiatedAt(LocalDateTime.now());
        bookingRepository.save(booking);
        
        auditService.logPaymentInitiated(booking);
    }
    
    @Transactional
    public void confirmPaymentByBuyer(Booking booking) {
        booking.setBuyerConfirmedPayment(true);
        bookingRepository.save(booking);
        
        auditService.logBuyerConfirmedPayment(booking);
    }
    
    @Transactional
    public Booking confirmPaymentByAdmin(Booking booking, String adminUser) {
        booking.setStatus("confirmed");
        booking.setConfirmedAt(LocalDateTime.now());
        Booking saved = bookingRepository.save(booking);
        
        // Generate tickets
        ticketService.generateTicketsForBooking(saved);
        
        // Update show availability
        updateShowAvailability(saved.getShow());
        
        auditService.logPaymentConfirmed(saved, adminUser);
        
        return saved;
    }
    
    @Transactional
    public void updateShowAvailability(Show show) {
        List<Booking> confirmedBookings = bookingRepository.findConfirmedBookingsByShowId(show.getId());
        int totalBooked = confirmedBookings.stream()
                .mapToInt(b -> b.getAdultTickets() + b.getStudentTickets())
                .sum();
        show.setAvailableTickets(Math.max(0, show.getTotalTickets() - totalBooked));
        showRepository.save(show);
    }
    
    @Transactional
    public void deleteBooking(Long bookingId) {
        bookingRepository.deleteById(bookingId);
    }
}

