package com.ticketbroker.controller.api;

import com.ticketbroker.dto.BookingRequest;
import com.ticketbroker.dto.BookingResponse;
import com.ticketbroker.dto.ShowResponse;
import com.ticketbroker.dto.TicketValidationRequest;
import com.ticketbroker.model.Booking;
import com.ticketbroker.model.Show;
import com.ticketbroker.model.Ticket;
import com.ticketbroker.repository.ShowRepository;
import com.ticketbroker.service.BookingService;
import com.ticketbroker.service.EmailService;
import com.ticketbroker.service.TicketService;
import com.ticketbroker.service.SettingsService;
import com.ticketbroker.util.SwishUrlGenerator;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public")
@CrossOrigin(origins = "*")
public class PublicApiController {
    private final ShowRepository showRepository;
    private final BookingService bookingService;
    private final TicketService ticketService;
    private final EmailService emailService;
    private final SettingsService settingsService;
    private final SwishUrlGenerator swishUrlGenerator;
    
    public PublicApiController(ShowRepository showRepository, BookingService bookingService,
                              TicketService ticketService, EmailService emailService,
                              SettingsService settingsService, SwishUrlGenerator swishUrlGenerator) {
        this.showRepository = showRepository;
        this.bookingService = bookingService;
        this.ticketService = ticketService;
        this.emailService = emailService;
        this.settingsService = settingsService;
        this.swishUrlGenerator = swishUrlGenerator;
    }
    
    @GetMapping("/shows")
    public ResponseEntity<List<ShowResponse>> getShows() {
        List<Show> shows = showRepository.findAllByOrderByStartTimeAsc();
        List<ShowResponse> responses = shows.stream()
                .map(ShowResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }
    
    @GetMapping("/shows/{id}/availability")
    public ResponseEntity<Map<String, Object>> checkAvailability(@PathVariable Long id) {
        Show show = showRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Show not found"));
        
        Map<String, Object> response = new HashMap<>();
        response.put("available", show.getAvailableTickets());
        response.put("total", show.getTotalTickets());
        response.put("soldOut", show.isSoldOut());
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/bookings")
    public ResponseEntity<BookingResponse> createBooking(@Valid @RequestBody BookingRequest request) {
        Booking booking = new Booking();
        Show show = showRepository.findById(request.getShowId())
                .orElseThrow(() -> new IllegalArgumentException("Show not found"));
        
        booking.setShow(show);
        booking.setFirstName(request.getFirstName());
        booking.setLastName(request.getLastName());
        booking.setEmail(request.getEmail());
        booking.setPhone(request.getPhone());
        booking.setAdultTickets(request.getAdultTickets());
        booking.setStudentTickets(request.getStudentTickets());
        booking.setGdprConsent(request.getGdprConsent());
        
        // Calculate total amount
        int adultPrice = Integer.parseInt(settingsService.getValue("adult_ticket_price", "200"));
        int studentPrice = Integer.parseInt(settingsService.getValue("student_ticket_price", "100"));
        booking.setTotalAmount((request.getAdultTickets() * adultPrice) + 
                              (request.getStudentTickets() * studentPrice));
        
        Booking created = bookingService.createBooking(booking);
        
        // Send confirmation email
        try {
            String paymentUrl = "/booking/success/" + created.getBookingReference() + "/" + created.getEmail();
            emailService.sendBookingConfirmation(created, paymentUrl);
            emailService.sendAdminNotification(created);
        } catch (Exception e) {
            // Log error but don't fail the booking
        }
        
        return ResponseEntity.status(HttpStatus.CREATED).body(BookingResponse.fromEntity(created));
    }
    
    @GetMapping("/bookings/{reference}")
    public ResponseEntity<BookingResponse> getBooking(@PathVariable String reference,
                                                      @RequestParam(required = false) String email) {
        Booking booking;
        if (email != null) {
            booking = bookingService.findByReferenceAndEmail(reference, email)
                    .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        } else {
            booking = bookingService.findByReference(reference)
                    .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        }
        
        return ResponseEntity.ok(BookingResponse.fromEntity(booking));
    }
    
    @PostMapping("/bookings/{reference}/initiate-payment")
    public ResponseEntity<Map<String, String>> initiatePayment(@PathVariable String reference,
                                                               @RequestParam String email) {
        Booking booking = bookingService.findByReferenceAndEmail(reference, email)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        
        bookingService.initiatePayment(booking);
        
        String swishNumber = settingsService.getValue("swish_number", "012 345 67 89");
        String swishUrl = swishUrlGenerator.generateSwishUrl(swishNumber, booking.getTotalAmount(), 
                                                              booking.getBookingReference());
        
        Map<String, String> response = new HashMap<>();
        response.put("swishUrl", swishUrl);
        response.put("swishNumber", swishNumber);
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/bookings/{reference}/confirm-payment")
    public ResponseEntity<BookingResponse> confirmPayment(@PathVariable String reference,
                                                         @RequestParam String email) {
        Booking booking = bookingService.findByReferenceAndEmail(reference, email)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        
        bookingService.confirmPaymentByBuyer(booking);
        
        return ResponseEntity.ok(BookingResponse.fromEntity(booking));
    }
    
    @PostMapping("/tickets/validate")
    public ResponseEntity<Map<String, Object>> validateTicket(@Valid @RequestBody TicketValidationRequest request) {
        Ticket ticket = ticketService.findByReference(request.getTicketReference())
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));
        
        Map<String, Object> response = new HashMap<>();
        
        // Check if ticket is already used
        if (ticket.getIsUsed()) {
            response.put("valid", false);
            response.put("message", "Biljett redan använd");
            response.put("status", "used");
            response.put("ticketReference", ticket.getTicketReference());
            if (ticket.getUsedAt() != null) {
                response.put("usedAt", ticket.getUsedAt().toString());
            }
            return ResponseEntity.ok(response);
        }
        
        // Check if booking is confirmed
        if (!"confirmed".equals(ticket.getBooking().getStatus())) {
            response.put("valid", false);
            response.put("message", "Biljett inte bekräftad");
            response.put("status", "unconfirmed");
            response.put("ticketReference", ticket.getTicketReference());
            response.put("bookingStatus", ticket.getBooking().getStatus());
            return ResponseEntity.ok(response);
        }
        
        // Check if ticket is for the correct show (if showId provided)
        if (request.getShowId() != null && !request.getShowId().equals(ticket.getShow().getId())) {
            response.put("valid", false);
            response.put("message", "Biljett för fel föreställning");
            response.put("status", "wrong_show");
            response.put("ticketReference", ticket.getTicketReference());
            response.put("ticketShowId", ticket.getShow().getId());
            response.put("validationShowId", request.getShowId());
            return ResponseEntity.ok(response);
        }
        
        // Mark ticket as used
        ticketService.markTicketAsUsed(ticket, "Door validation");
        
        // Return success response
        response.put("valid", true);
        response.put("message", "Biljett godkänd - välkommen in!");
        response.put("status", "success");
        response.put("ticketReference", ticket.getTicketReference());
        response.put("ticketType", "normal".equals(ticket.getTicketType()) ? "Ordinarie" : "Student");
        response.put("bookingReference", ticket.getBooking().getBookingReference());
        response.put("usedAt", ticket.getUsedAt().toString());
        
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/settings")
    public ResponseEntity<Map<String, String>> getSettings() {
        Map<String, String> settings = new HashMap<>();
        settings.put("concertName", settingsService.getValue("concert_name", "Klasskonsert 24C"));
        settings.put("concertDate", settingsService.getValue("concert_date", "29/1 2026"));
        settings.put("concertVenue", settingsService.getValue("concert_venue", "Aulan på Rytmus Stockholm"));
        settings.put("adultPrice", settingsService.getValue("adult_ticket_price", "200"));
        settings.put("studentPrice", settingsService.getValue("student_ticket_price", "100"));
        settings.put("swishNumber", settingsService.getValue("swish_number", "012 345 67 89"));
        settings.put("contactEmail", settingsService.getValue("contact_email", "admin@example.com"));
        
        return ResponseEntity.ok(settings);
    }
}

