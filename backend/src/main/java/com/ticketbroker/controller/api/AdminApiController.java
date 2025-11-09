package com.ticketbroker.controller.api;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ticketbroker.dto.BookingResponse;
import com.ticketbroker.model.Booking;
import com.ticketbroker.model.BookingStatus;
import com.ticketbroker.model.Show;
import com.ticketbroker.model.Ticket;
import com.ticketbroker.repository.BookingRepository;
import com.ticketbroker.repository.ShowRepository;
import com.ticketbroker.repository.TicketRepository;
import com.ticketbroker.service.AuditService;
import com.ticketbroker.service.BookingService;
import com.ticketbroker.service.EmailService;
import com.ticketbroker.service.ExcelService;
import com.ticketbroker.service.PdfService;
import com.ticketbroker.service.SettingsService;
import com.ticketbroker.service.TicketService;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminApiController {
    private final BookingRepository bookingRepository;
    private final TicketRepository ticketRepository;
    private final ShowRepository showRepository;
    private final BookingService bookingService;
    private final TicketService ticketService;
    private final EmailService emailService;
    private final PdfService pdfService;
    private final ExcelService excelService;
    private final SettingsService settingsService;
    private final AuditService auditService;
    private static final DateTimeFormatter SHOW_DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;

    public AdminApiController(BookingRepository bookingRepository, TicketRepository ticketRepository,
            ShowRepository showRepository,
            BookingService bookingService, TicketService ticketService,
            EmailService emailService, PdfService pdfService,
            ExcelService excelService, SettingsService settingsService,
            AuditService auditService) {
        this.bookingRepository = bookingRepository;
        this.ticketRepository = ticketRepository;
        this.showRepository = showRepository;
        this.bookingService = bookingService;
        this.ticketService = ticketService;
        this.emailService = emailService;
        this.pdfService = pdfService;
        this.excelService = excelService;
        this.settingsService = settingsService;
        this.auditService = auditService;
    }

    @GetMapping("/bookings")
    public ResponseEntity<List<BookingResponse>> getAllBookings() {
        List<Booking> bookings = bookingRepository.findAll();
        List<BookingResponse> responses = bookings.stream()
                .map(BookingResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/bookings/{id}")
    public ResponseEntity<BookingResponse> getBookingById(@PathVariable Long id) {
        Objects.requireNonNull(id, "Booking ID cannot be null");
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        return ResponseEntity.ok(BookingResponse.fromEntity(booking));
    }

    @PutMapping("/bookings/{id}")
    public ResponseEntity<BookingResponse> updateBooking(@PathVariable Long id,
            @RequestBody Map<String, String> updates,
            @RequestParam(defaultValue = "admin") String adminUser) {
        Objects.requireNonNull(id, "Booking ID cannot be null");
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        // Track changes for audit log
        Map<String, Object> changedFields = new HashMap<>();
        BookingStatus oldStatus = booking.getStatus();

        // Update allowed fields (firstName, lastName, email, phone)
        if (updates.containsKey("firstName") && !booking.getFirstName().equals(updates.get("firstName"))) {
            changedFields.put("firstName", Map.of("old", booking.getFirstName(), "new", updates.get("firstName")));
            booking.setFirstName(updates.get("firstName"));
        }
        if (updates.containsKey("lastName") && !booking.getLastName().equals(updates.get("lastName"))) {
            changedFields.put("lastName", Map.of("old", booking.getLastName(), "new", updates.get("lastName")));
            booking.setLastName(updates.get("lastName"));
        }
        if (updates.containsKey("email") && !booking.getEmail().equals(updates.get("email"))) {
            changedFields.put("email", Map.of("old", booking.getEmail(), "new", updates.get("email")));
            booking.setEmail(updates.get("email"));
        }
        if (updates.containsKey("phone") && !booking.getPhone().equals(updates.get("phone"))) {
            changedFields.put("phone", Map.of("old", booking.getPhone(), "new", updates.get("phone")));
            booking.setPhone(updates.get("phone"));
        }

        // Update payment status fields
        if (updates.containsKey("swishPaymentInitiated")) {
            boolean newValue = Boolean.parseBoolean(updates.get("swishPaymentInitiated"));
            if (booking.getSwishPaymentInitiated() != newValue) {
                changedFields.put("swishPaymentInitiated",
                        Map.of("old", booking.getSwishPaymentInitiated(), "new", newValue));
                booking.setSwishPaymentInitiated(newValue);
                if (newValue && booking.getSwishPaymentInitiatedAt() == null) {
                    booking.setSwishPaymentInitiatedAt(java.time.LocalDateTime.now());
                }
            }
        }
        if (updates.containsKey("buyerConfirmedPayment")) {
            boolean newValue = Boolean.parseBoolean(updates.get("buyerConfirmedPayment"));
            if (booking.getBuyerConfirmedPayment() != newValue) {
                changedFields.put("buyerConfirmedPayment",
                        Map.of("old", booking.getBuyerConfirmedPayment(), "new", newValue));
                booking.setBuyerConfirmedPayment(newValue);
            }
        }

        // Update status if provided (status changes are logged separately in
        // updateBookingStatus)
        if (updates.containsKey("status")) {
            try {
                BookingStatus newStatus = BookingStatus.valueOf(updates.get("status").toUpperCase());
                if (oldStatus != newStatus) {
                    booking = bookingService.updateBookingStatus(booking, newStatus, adminUser);
                    // Status change is already logged in updateBookingStatus, so we don't add it
                    // here
                }
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid booking status: " + updates.get("status"));
            }
        }

        // Note: adultTickets and studentTickets are not updated
        // as they cannot be changed after booking creation

        Booking nonNullBooking = Objects.requireNonNull(booking, "Booking cannot be null");
        Booking saved = bookingRepository.save(nonNullBooking);

        // Log changes to audit log (only if there were actual changes, excluding status
        // which is logged separately)
        if (!changedFields.isEmpty()) {
            auditService.logBookingUpdated(saved, changedFields, adminUser);
        }

        return ResponseEntity.ok(BookingResponse.fromEntity(saved));
    }

    @PostMapping("/bookings/{id}/confirm-payment")
    public ResponseEntity<BookingResponse> confirmPayment(@PathVariable Long id,
            @RequestParam(defaultValue = "admin") String adminUser) {
        Objects.requireNonNull(id, "Booking ID cannot be null");
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        Booking confirmed = bookingService.confirmPaymentByAdmin(booking, adminUser);

        // Send confirmation email with PDF
        try {
            byte[] pdfData = pdfService.generateTicketsPdf(confirmed);
            emailService.sendPaymentConfirmed(confirmed, pdfData);
        } catch (Exception e) {
            // Log error but don't fail
        }

        return ResponseEntity.ok(BookingResponse.fromEntity(confirmed));
    }

    @DeleteMapping("/bookings/{id}")
    public ResponseEntity<Void> deleteBooking(@PathVariable Long id) {
        Objects.requireNonNull(id, "Booking ID cannot be null");
        bookingService.deleteBooking(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bookings/{id}/resend-confirmation")
    public ResponseEntity<Map<String, String>> resendConfirmation(@PathVariable Long id) {
        Objects.requireNonNull(id, "Booking ID cannot be null");
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Kan endast skicka om bekräftelse för obekräftade bokningar.");
            return ResponseEntity.badRequest().body(error);
        }

        try {
            // Generate payment URL
            String paymentUrl = "/booking/success/" + booking.getBookingReference() + "/" + booking.getEmail();
            emailService.sendBookingConfirmation(booking, paymentUrl);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Bekräftelse skickad om till " + booking.getFullName() + "!");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Ett fel uppstod vid omssändning av bekräftelse.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PostMapping("/bookings/{id}/resend-tickets")
    public ResponseEntity<Map<String, String>> resendTickets(@PathVariable Long id) {
        Objects.requireNonNull(id, "Booking ID cannot be null");
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Kan endast skicka om biljetter för bekräftade bokningar.");
            return ResponseEntity.badRequest().body(error);
        }

        if (booking.getTickets() == null || booking.getTickets().isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Inga biljetter att skicka om.");
            return ResponseEntity.badRequest().body(error);
        }

        try {
            byte[] pdfData = pdfService.generateTicketsPdf(booking);
            emailService.sendPaymentConfirmed(booking, pdfData);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Biljetter skickade om till " + booking.getFullName() + "!");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Ett fel uppstod vid omssändning av biljetter.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @GetMapping("/tickets")
    public ResponseEntity<List<Map<String, Object>>> getAllTickets(
            @RequestParam(required = false) Long showId,
            @RequestParam(required = false) String used,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String bookingRef) {
        List<Ticket> tickets = ticketRepository.findAll();

        // Apply filters
        if (showId != null) {
            tickets = tickets.stream()
                    .filter(t -> t.getShow().getId().equals(showId))
                    .collect(Collectors.toList());
        }

        if ("used".equals(used)) {
            tickets = tickets.stream()
                    .filter(Ticket::getIsUsed)
                    .collect(Collectors.toList());
        } else if ("unused".equals(used)) {
            tickets = tickets.stream()
                    .filter(t -> !t.getIsUsed())
                    .collect(Collectors.toList());
        }

        if (bookingRef != null && !bookingRef.isEmpty()) {
            String finalBookingRef = bookingRef.toUpperCase();
            tickets = tickets.stream()
                    .filter(t -> t.getBooking().getBookingReference().equalsIgnoreCase(finalBookingRef))
                    .collect(Collectors.toList());
        }

        if (search != null && !search.isEmpty()) {
            String finalSearch = search.toLowerCase();
            tickets = tickets.stream()
                    .filter(t -> t.getTicketReference().toLowerCase().contains(finalSearch) ||
                            t.getBooking().getBookingReference().toLowerCase().contains(finalSearch) ||
                            (t.getBuyer().getFirstName() + " " + t.getBuyer().getLastName())
                                    .toLowerCase().contains(finalSearch))
                    .collect(Collectors.toList());
        }

        // Sort by created date descending
        tickets = tickets.stream()
                .sorted((t1, t2) -> t2.getCreatedAt().compareTo(t1.getCreatedAt()))
                .collect(Collectors.toList());

        List<Map<String, Object>> responses = tickets.stream().map(ticket -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", ticket.getId());
            map.put("ticketReference", ticket.getTicketReference());
            map.put("ticketType", ticket.getTicketType());
            map.put("isUsed", ticket.getIsUsed());
            map.put("usedAt", ticket.getUsedAt());
            map.put("checkedBy", ticket.getCheckedBy());
            map.put("createdAt", ticket.getCreatedAt());
            map.put("bookingReference", ticket.getBooking().getBookingReference());
            map.put("buyerName", ticket.getBuyer().getFirstName() + " " + ticket.getBuyer().getLastName());
            map.put("buyerPhone", ticket.getBuyer().getPhone());
            map.put("showTime", ticket.getShow().getStartTime() + "-" + ticket.getShow().getEndTime());
            map.put("showId", ticket.getShow().getId());
            return map;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/tickets/{id}/toggle-state")
    public ResponseEntity<Map<String, Object>> toggleTicketState(@PathVariable Long id,
            @RequestParam String checkerUser) {
        Objects.requireNonNull(id, "Ticket ID cannot be null");
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));

        ticketService.toggleTicketState(ticket, checkerUser);

        Map<String, Object> response = new HashMap<>();
        response.put("id", ticket.getId());
        response.put("isUsed", ticket.getIsUsed());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/tickets/by-reference/{reference}")
    public ResponseEntity<Map<String, Object>> getTicketByReference(@PathVariable String reference) {
        Ticket ticket = ticketService.findByReference(reference.toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));

        Map<String, Object> response = new HashMap<>();
        response.put("id", ticket.getId());
        response.put("ticketReference", ticket.getTicketReference());
        response.put("ticketType", ticket.getTicketType());
        response.put("isUsed", ticket.getIsUsed());
        response.put("usedAt", ticket.getUsedAt());
        response.put("checkedBy", ticket.getCheckedBy());
        response.put("createdAt", ticket.getCreatedAt());
        response.put("bookingReference", ticket.getBooking().getBookingReference());
        response.put("buyerName", ticket.getBuyer().getFirstName() + " " + ticket.getBuyer().getLastName());
        response.put("buyerPhone", ticket.getBuyer().getPhone());
        response.put("buyerEmail", ticket.getBuyer().getEmail());
        response.put("showTime", ticket.getShow().getStartTime() + "-" + ticket.getShow().getEndTime());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/tickets/by-reference/{reference}/toggle-state")
    public ResponseEntity<Map<String, Object>> toggleTicketStateByReference(@PathVariable String reference,
            @RequestParam(defaultValue = "admin") String checkerUser) {
        Ticket ticket = ticketService.findByReference(reference.toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));

        ticketService.toggleTicketState(ticket, checkerUser);

        Map<String, Object> response = new HashMap<>();
        response.put("id", ticket.getId());
        response.put("ticketReference", ticket.getTicketReference());
        response.put("isUsed", ticket.getIsUsed());
        response.put("usedAt", ticket.getUsedAt());
        response.put("checkedBy", ticket.getCheckedBy());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/tickets/{id}")
    public ResponseEntity<Void> deleteTicket(@PathVariable Long id,
            @RequestParam(defaultValue = "admin") String adminUser,
            @RequestParam(required = false) String reason) {
        Objects.requireNonNull(id, "Ticket ID cannot be null");
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));

        ticketService.deleteTicket(ticket, adminUser, reason);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/shows")
    public ResponseEntity<List<Map<String, Object>>> getAllShows() {
        List<Show> shows = showRepository.findAllByOrderByDateAscStartTimeAsc();
        List<Map<String, Object>> responses = shows.stream().map(show -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", show.getId());
            map.put("date", show.getDate() != null ? show.getDate().format(SHOW_DATE_FORMATTER) : null);
            map.put("startTime", show.getStartTime());
            map.put("endTime", show.getEndTime());
            map.put("totalTickets", show.getTotalTickets());
            map.put("availableTickets", show.getAvailableTickets());
            map.put("bookingsCount", show.getBookings() != null ? show.getBookings().size() : 0);
            return map;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/shows")
    public ResponseEntity<Map<String, Object>> createShow(@RequestBody Map<String, Object> request) {
        Show show = new Show();
        LocalDate showDate = parseShowDate(request.get("date"));
        
        // Validate that the date is not in the past
        LocalDate today = LocalDate.now();
        if (showDate != null && showDate.isBefore(today)) {
            throw new IllegalArgumentException("Datum kan inte vara tidigare än idag.");
        }
        
        show.setDate(showDate);
        show.setStartTime((String) request.get("startTime"));
        show.setEndTime((String) request.get("endTime"));
        Integer totalTickets = request.get("totalTickets") != null ? ((Number) request.get("totalTickets")).intValue()
                : 100;
        show.setTotalTickets(totalTickets);
        show.setAvailableTickets(totalTickets);

        show = showRepository.save(show);

        Map<String, Object> response = new HashMap<>();
        response.put("id", show.getId());
        response.put("date", show.getDate() != null ? show.getDate().format(SHOW_DATE_FORMATTER) : null);
        response.put("startTime", show.getStartTime());
        response.put("endTime", show.getEndTime());
        response.put("totalTickets", show.getTotalTickets());
        response.put("availableTickets", show.getAvailableTickets());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/shows/{id}")
    public ResponseEntity<Map<String, Object>> updateShow(@PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        Objects.requireNonNull(id, "Show ID cannot be null");
        Show show = showRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Show not found"));

        Integer newTotalTickets = request.get("totalTickets") != null
                ? ((Number) request.get("totalTickets")).intValue()
                : show.getTotalTickets();
        Integer newAvailableTickets = request.get("availableTickets") != null
                ? ((Number) request.get("availableTickets")).intValue()
                : show.getAvailableTickets();

        // Validation
        if (newTotalTickets < 0) {
            throw new IllegalArgumentException("Totalt antal biljetter kan inte vara negativt.");
        }
        if (newAvailableTickets < 0) {
            throw new IllegalArgumentException("Tillgängliga biljetter kan inte vara negativa.");
        }
        if (newAvailableTickets > newTotalTickets) {
            throw new IllegalArgumentException("Tillgängliga biljetter kan inte vara fler än totalt antal biljetter.");
        }

        // Calculate how many tickets are currently booked
        List<Booking> confirmedBookings = bookingRepository.findConfirmedBookingsByShowId(id);
        int totalBooked = confirmedBookings.stream()
                .mapToInt(b -> b.getAdultTickets() + b.getStudentTickets())
                .sum();

        // Check if we're trying to set available tickets too low
        if (newAvailableTickets < totalBooked) {
            throw new IllegalArgumentException(
                    String.format(
                            "Kan inte sätta tillgängliga biljetter till %d. Det finns redan %d bekräftade biljetter.",
                            newAvailableTickets, totalBooked));
        }

        show.setTotalTickets(newTotalTickets);
        show.setAvailableTickets(newAvailableTickets);
        show = showRepository.save(show);

        Map<String, Object> response = new HashMap<>();
        response.put("id", show.getId());
        response.put("date", show.getDate() != null ? show.getDate().format(SHOW_DATE_FORMATTER) : null);
        response.put("startTime", show.getStartTime());
        response.put("endTime", show.getEndTime());
        response.put("totalTickets", show.getTotalTickets());
        response.put("availableTickets", show.getAvailableTickets());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/shows/{id}")
    public ResponseEntity<Void> deleteShow(@PathVariable Long id) {
        Objects.requireNonNull(id, "Show ID cannot be null");
        Show show = showRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Show not found"));

        if (show.getBookings() != null && !show.getBookings().isEmpty()) {
            throw new IllegalArgumentException("Kan inte radera föreställning med befintliga bokningar.");
        }

        showRepository.delete(show);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/export/excel")
    public ResponseEntity<byte[]> exportExcel() {
        try {
            List<Booking> bookings = bookingRepository.findAll();
            byte[] excelData = excelService.exportBookingsToExcel(bookings);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", "bookings.xlsx");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(excelData);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/export/revenue")
    public ResponseEntity<byte[]> exportRevenueReport() {
        try {
            List<Booking> bookings = bookingRepository.findAll();
            byte[] excelData = excelService.exportRevenueReport(bookings);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            String filename = "revenue_report_"
                    + java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"))
                    + ".xlsx";
            headers.setContentDispositionFormData("attachment", filename);

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(excelData);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/settings")
    public ResponseEntity<Map<String, String>> getSettings() {
        Map<String, String> settings = new HashMap<>();
        settings.put("concertName", settingsService.getValue("concert_name", "Klasskonsert 24C"));
        settings.put("welcomeMessage",
                settingsService.getValue("welcome_message", "Välkommen till 24c:s klasspelning!"));
        // concertDate removed - dates are now managed via shows
        settings.put("concertVenue", settingsService.getValue("concert_venue", "Aulan på Rytmus Stockholm"));
        settings.put("adultPrice", settingsService.getValue("adult_ticket_price", "200"));
        settings.put("studentPrice", settingsService.getValue("student_ticket_price", "100"));
        settings.put("adultTicketLabel", settingsService.getValue("adult_ticket_label", "Ordinariebiljett"));
        settings.put("studentTicketLabel", settingsService.getValue("student_ticket_label", "Studentbiljett"));
        settings.put("swishNumber", settingsService.getValue("swish_number", "012 345 67 89"));
        settings.put("swishRecipientName", settingsService.getValue("swish_recipient_name", "Event Organizer"));
        settings.put("contactEmail", settingsService.getValue("contact_email", "admin@example.com"));
        settings.put("adminEmail", settingsService.getValue("admin_email", "klasskonsertgruppen@gmail.com"));
        settings.put("maxTicketsPerBooking", settingsService.getValue("max_tickets_per_booking", "4"));

        // Include image data if present
        String classPhotoData = settingsService.getValue("class_photo_data", null);
        if (classPhotoData != null) {
            settings.put("classPhotoData", classPhotoData);
            settings.put("classPhotoContentType", settingsService.getValue("class_photo_content_type", "image/jpeg"));
        }

        String qrLogoData = settingsService.getValue("qr_logo_data", null);
        if (qrLogoData != null) {
            settings.put("qrLogoData", qrLogoData);
            settings.put("qrLogoContentType", settingsService.getValue("qr_logo_content_type", "image/jpeg"));
        }

        return ResponseEntity.ok(settings);
    }

    @PostMapping(value = "/settings", consumes = { MediaType.MULTIPART_FORM_DATA_VALUE,
            MediaType.APPLICATION_JSON_VALUE })
    public ResponseEntity<Map<String, String>> updateSettings(
            @RequestParam(value = "concert_name", required = false) String concertName,
            @RequestParam(value = "welcome_message", required = false) String welcomeMessage,
            @RequestParam(value = "concert_venue", required = false) String concertVenue,
            @RequestParam(value = "adult_ticket_price", required = false) String adultPrice,
            @RequestParam(value = "student_ticket_price", required = false) String studentPrice,
            @RequestParam(value = "adult_ticket_label", required = false) String adultTicketLabel,
            @RequestParam(value = "student_ticket_label", required = false) String studentTicketLabel,
            @RequestParam(value = "swish_number", required = false) String swishNumber,
            @RequestParam(value = "swish_recipient_name", required = false) String swishRecipientName,
            @RequestParam(value = "contact_email", required = false) String contactEmail,
            @RequestParam(value = "admin_email", required = false) String adminEmail,
            @RequestParam(value = "max_tickets_per_booking", required = false) String maxTicketsPerBooking,
            @RequestParam(value = "class_photo", required = false) org.springframework.web.multipart.MultipartFile classPhoto,
            @RequestParam(value = "qr_logo", required = false) org.springframework.web.multipart.MultipartFile qrLogo) {

        org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(AdminApiController.class);
        logger.info("Received settings update request - classPhoto: {}, qrLogo: {}",
                classPhoto != null ? (classPhoto.isEmpty() ? "empty" : "present") : "null",
                qrLogo != null ? (qrLogo.isEmpty() ? "empty" : "present") : "null");

        // Handle text settings
        if (concertName != null)
            settingsService.setValue("concert_name", concertName);
        if (welcomeMessage != null)
            settingsService.setValue("welcome_message", welcomeMessage);
        // concert_date removed - dates are now managed via shows
        if (concertVenue != null)
            settingsService.setValue("concert_venue", concertVenue);
        if (adultPrice != null)
            settingsService.setValue("adult_ticket_price", adultPrice);
        if (studentPrice != null)
            settingsService.setValue("student_ticket_price", studentPrice);
        if (adultTicketLabel != null)
            settingsService.setValue("adult_ticket_label", adultTicketLabel);
        if (studentTicketLabel != null)
            settingsService.setValue("student_ticket_label", studentTicketLabel);
        if (swishNumber != null)
            settingsService.setValue("swish_number", swishNumber);
        if (swishRecipientName != null)
            settingsService.setValue("swish_recipient_name", swishRecipientName);
        if (contactEmail != null)
            settingsService.setValue("contact_email", contactEmail);
        if (adminEmail != null)
            settingsService.setValue("admin_email", adminEmail);
        if (maxTicketsPerBooking != null)
            settingsService.setValue("max_tickets_per_booking", maxTicketsPerBooking);

        // Handle class photo upload
        if (classPhoto != null && !classPhoto.isEmpty()) {
            try {
                logger.info("Processing class photo upload - filename: {}, size: {} bytes, contentType: {}",
                        classPhoto.getOriginalFilename(), classPhoto.getSize(), classPhoto.getContentType());
                byte[] photoBytes = classPhoto.getBytes();
                String photoBase64 = java.util.Base64.getEncoder().encodeToString(photoBytes);
                String contentType = classPhoto.getContentType();
                if (contentType == null) {
                    String filename = classPhoto.getOriginalFilename();
                    if (filename != null && filename.toLowerCase().endsWith(".png")) {
                        contentType = "image/png";
                    } else {
                        contentType = "image/jpeg";
                    }
                }
                settingsService.setValue("class_photo_data", photoBase64);
                settingsService.setValue("class_photo_content_type", contentType);
                logger.info("Class photo saved successfully - size: {} bytes, contentType: {}", photoBytes.length,
                        contentType);
            } catch (Exception e) {
                logger.error("Failed to process class photo", e);
                throw new RuntimeException("Failed to process class photo", e);
            }
        } else {
            logger.debug("No class photo uploaded (classPhoto is null or empty)");
        }

        // Handle QR logo upload
        if (qrLogo != null && !qrLogo.isEmpty()) {
            try {
                logger.info("Processing QR logo upload - filename: {}, size: {} bytes, contentType: {}",
                        qrLogo.getOriginalFilename(), qrLogo.getSize(), qrLogo.getContentType());
                byte[] logoBytes = qrLogo.getBytes();
                String logoBase64 = java.util.Base64.getEncoder().encodeToString(logoBytes);
                String contentType = qrLogo.getContentType();
                if (contentType == null) {
                    String filename = qrLogo.getOriginalFilename();
                    if (filename != null && filename.toLowerCase().endsWith(".png")) {
                        contentType = "image/png";
                    } else {
                        contentType = "image/jpeg";
                    }
                }
                settingsService.setValue("qr_logo_data", logoBase64);
                settingsService.setValue("qr_logo_content_type", contentType);
                logger.info("QR logo saved successfully - size: {} bytes, contentType: {}", logoBytes.length,
                        contentType);
            } catch (Exception e) {
                logger.error("Failed to process QR logo", e);
                throw new RuntimeException("Failed to process QR logo", e);
            }
        } else {
            logger.debug("No QR logo uploaded (qrLogo is null or empty)");
        }

        // Return updated settings
        return getSettings();
    }

    private LocalDate parseShowDate(Object dateValue) {
        if (dateValue == null) {
            throw new IllegalArgumentException("Datum måste anges.");
        }

        if (dateValue instanceof String) {
            String dateStr = ((String) dateValue).trim();
            if (dateStr.isEmpty()) {
                throw new IllegalArgumentException("Datum måste anges.");
            }
            try {
                return LocalDate.parse(dateStr, SHOW_DATE_FORMATTER);
            } catch (DateTimeParseException ex) {
                throw new IllegalArgumentException("Ogiltigt datumformat. Använd yyyy-MM-dd.", ex);
            }
        }

        throw new IllegalArgumentException("Ogiltigt datumformat. Använd yyyy-MM-dd.");
    }
}
