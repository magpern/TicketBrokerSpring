package com.ticketbroker.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticketbroker.model.Booking;
import com.ticketbroker.model.BookingStatus;
import com.ticketbroker.model.Show;
import com.ticketbroker.repository.BookingRepository;
import com.ticketbroker.repository.ShowRepository;
import com.ticketbroker.repository.TicketRepository;
import com.ticketbroker.util.BookingReferenceGenerator;

@Service
public class BookingService {
    private static final Logger logger = LoggerFactory.getLogger(BookingService.class);
    static final Duration DUPLICATE_WINDOW = Duration.ofSeconds(60);

    public record CreateBookingResult(Booking booking, boolean duplicate) {
    }

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
    public CreateBookingResult createBooking(Booking booking) {
        Objects.requireNonNull(booking.getShow(), "Booking show cannot be null");
        Long showId = Objects.requireNonNull(booking.getShow().getId(), "Show ID cannot be null");
        // The lock serializes bookings per show, so two near-simultaneous submits can't both
        // pass the duplicate check below (or both pass the availability check).
        Show show = showRepository.findByIdForUpdate(showId)
                .orElseThrow(() -> new IllegalArgumentException("Show not found"));

        // A double-click or client retry submits the same booking again within seconds;
        // hand back the first booking instead of reserving the seats a second time.
        List<Booking> duplicates = bookingRepository.findRecentDuplicates(booking.getEmail(), showId,
                booking.getAdultTickets(), booking.getStudentTickets(),
                LocalDateTime.now().minus(DUPLICATE_WINDOW));
        if (!duplicates.isEmpty()) {
            Booking existing = duplicates.get(0);
            logger.info("Duplicate booking submission for show {} detected; returning existing booking {}",
                    showId, existing.getBookingReference());
            return new CreateBookingResult(existing, true);
        }

        // Check availability
        if (show.getAvailableTickets() < booking.getTotalTickets()) {
            throw new IllegalArgumentException("Not enough tickets available");
        }

        // Generate booking reference
        booking.setBookingReference(bookingReferenceGenerator.generateUniqueReference());
        booking.setStatus(BookingStatus.RESERVED);
        booking.setCreatedAt(LocalDateTime.now());
        booking.setShow(show);

        Booking saved = bookingRepository.save(booking);

        // Decrease available tickets immediately when booking is created (RESERVED)
        // This prevents overbooking when multiple customers book before admin confirms
        show.setAvailableTickets(Math.max(0, show.getAvailableTickets() - saved.getTotalTickets()));
        showRepository.save(show);

        // Log booking creation
        auditService.logBookingCreated(saved);

        return new CreateBookingResult(saved, false);
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

    public List<Booking> getBookingsByStatus(BookingStatus status) {
        return bookingRepository.findByStatus(status);
    }

    // Emails are stored as typed at booking time, so lookups must ignore case
    public List<Booking> getBookingsByEmail(String email) {
        return bookingRepository.findByEmailIgnoreCase(email.trim());
    }

    public List<Booking> getBookingsByEmailAndLastName(String email, String lastName) {
        return bookingRepository.findByEmailIgnoreCaseAndLastNameIgnoreCase(email.trim(), lastName.trim());
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

    /**
     * Result of an admin payment confirmation. {@code newlyConfirmed} is false when the
     * booking was already confirmed and nothing was changed, so callers can skip side
     * effects such as sending the confirmation email again.
     */
    public record PaymentConfirmation(Booking booking, boolean newlyConfirmed) {
    }

    @Transactional
    public PaymentConfirmation confirmPaymentByAdmin(Long bookingId, String adminUser) {
        Objects.requireNonNull(bookingId, "Booking ID cannot be null");
        // Lock the booking row so a concurrent confirmation waits for this one and then
        // sees the CONFIRMED status instead of generating tickets a second time
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            return new PaymentConfirmation(booking, false);
        }

        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setConfirmedAt(LocalDateTime.now());
        Booking saved = bookingRepository.save(booking);

        // Generate tickets
        ticketService.generateTicketsForBooking(saved);

        // Update show availability
        updateShowAvailability(saved.getShow());

        auditService.logPaymentConfirmed(saved, adminUser);

        return new PaymentConfirmation(saved, true);
    }

    @Transactional
    public void updateShowAvailability(Show show) {
        // Count both RESERVED and CONFIRMED bookings to ensure consistency
        // RESERVED bookings already decreased available tickets when created
        // CONFIRMED bookings are the same bookings that were RESERVED, so we count all active bookings
        List<Booking> activeBookings = bookingRepository.findByShowId(show.getId());
        int totalBooked = activeBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.RESERVED || b.getStatus() == BookingStatus.CONFIRMED)
                .mapToInt(b -> b.getAdultTickets() + b.getStudentTickets())
                .sum();
        show.setAvailableTickets(Math.max(0, show.getTotalTickets() - totalBooked));
        showRepository.save(show);
    }

    @Transactional
    public void deleteBooking(Long bookingId) {
        Objects.requireNonNull(bookingId, "Booking ID cannot be null");
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        Show show = booking.getShow();
        
        // Increase available tickets back when booking is deleted
        // This works for both RESERVED and CONFIRMED bookings
        if (show != null && (booking.getStatus() == BookingStatus.RESERVED || booking.getStatus() == BookingStatus.CONFIRMED)) {
            show.setAvailableTickets(Math.min(show.getTotalTickets(), show.getAvailableTickets() + booking.getTotalTickets()));
            showRepository.save(show);
        }
        
        bookingRepository.deleteById(bookingId);
    }

    @Transactional
    public Booking updateBookingStatus(Booking booking, BookingStatus newStatus, String adminUser) {
        BookingStatus oldStatus = booking.getStatus();

        // If changing from confirmed to something else
        if (oldStatus == BookingStatus.CONFIRMED && newStatus != BookingStatus.CONFIRMED) {
            // Check if any tickets are used
            List<com.ticketbroker.model.Ticket> tickets = ticketService.getTicketsForBooking(booking);
            boolean hasUsedTickets = tickets.stream().anyMatch(com.ticketbroker.model.Ticket::getIsUsed);

            if (hasUsedTickets) {
                throw new IllegalArgumentException("Cannot change status: booking has used tickets");
            }

            // Delete all tickets for this booking
            for (com.ticketbroker.model.Ticket ticket : tickets) {
                Objects.requireNonNull(ticket, "Ticket cannot be null");
                ticketRepository.delete(ticket);
                auditService.logTicketDeleted(ticket, adminUser,
                        "Booking status changed from confirmed to " + newStatus.name());
            }

            // Update show availability
            // When changing from CONFIRMED to RESERVED, tickets are still "booked" so available tickets remain decreased
            // The updateShowAvailability will recalculate correctly
            updateShowAvailability(booking.getShow());
        }

        // If changing to confirmed
        if (oldStatus != BookingStatus.CONFIRMED && newStatus == BookingStatus.CONFIRMED) {
            // Status must be CONFIRMED before generating tickets, otherwise generation is rejected
            booking.setStatus(BookingStatus.CONFIRMED);
            booking.setConfirmedAt(LocalDateTime.now());
            // Generate tickets
            ticketService.generateTicketsForBooking(booking);
            // Available tickets already decreased when booking was created (RESERVED)
            // No need to decrease again, just ensure consistency
            updateShowAvailability(booking.getShow());
            auditService.logPaymentConfirmed(booking, adminUser);
        }

        booking.setStatus(newStatus);
        return bookingRepository.save(booking);
    }
}
