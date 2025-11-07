package com.ticketbroker.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticketbroker.model.Booking;
import com.ticketbroker.model.Show;
import com.ticketbroker.repository.BookingRepository;
import com.ticketbroker.repository.ShowRepository;
import com.ticketbroker.repository.TicketRepository;
import com.ticketbroker.util.BookingReferenceGenerator;

@Service
public class BookingService {
    private final BookingRepository bookingRepository;
    private final ShowRepository showRepository;
    private final BookingReferenceGenerator bookingReferenceGenerator;
    private final AuditService auditService;
    private final TicketService ticketService;
    private final TicketRepository ticketRepository;

    public BookingService(BookingRepository bookingRepository, ShowRepository showRepository,
            BookingReferenceGenerator bookingReferenceGenerator,
            AuditService auditService, TicketService ticketService,
            TicketRepository ticketRepository) {
        this.bookingRepository = bookingRepository;
        this.showRepository = showRepository;
        this.bookingReferenceGenerator = bookingReferenceGenerator;
        this.auditService = auditService;
        this.ticketService = ticketService;
        this.ticketRepository = ticketRepository;
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

    @Transactional
    public Booking updateBookingStatus(Booking booking, String newStatus, String adminUser) {
        String oldStatus = booking.getStatus();

        // If changing from confirmed to something else
        if ("confirmed".equals(oldStatus) && !"confirmed".equals(newStatus)) {
            // Check if any tickets are used
            List<com.ticketbroker.model.Ticket> tickets = ticketService.getTicketsForBooking(booking);
            boolean hasUsedTickets = tickets.stream().anyMatch(com.ticketbroker.model.Ticket::getIsUsed);

            if (hasUsedTickets) {
                throw new IllegalArgumentException("Cannot change status: booking has used tickets");
            }

            // Delete all tickets for this booking
            for (com.ticketbroker.model.Ticket ticket : tickets) {
                ticketRepository.delete(ticket);
                auditService.logTicketDeleted(ticket, adminUser,
                        "Booking status changed from confirmed to " + newStatus);
            }

            // Update show availability
            updateShowAvailability(booking.getShow());
        }

        // If changing to confirmed
        if (!"confirmed".equals(oldStatus) && "confirmed".equals(newStatus)) {
            booking.setConfirmedAt(LocalDateTime.now());
            // Generate tickets
            ticketService.generateTicketsForBooking(booking);
            // Update show availability
            updateShowAvailability(booking.getShow());
            auditService.logPaymentConfirmed(booking, adminUser);
        }

        booking.setStatus(newStatus);
        return bookingRepository.save(booking);
    }
}
