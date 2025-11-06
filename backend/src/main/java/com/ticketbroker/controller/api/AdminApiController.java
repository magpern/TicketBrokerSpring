package com.ticketbroker.controller.api;

import com.ticketbroker.dto.BookingResponse;
import com.ticketbroker.model.Booking;
import com.ticketbroker.model.Ticket;
import com.ticketbroker.repository.AuditLogRepository;
import com.ticketbroker.repository.BookingRepository;
import com.ticketbroker.repository.TicketRepository;
import com.ticketbroker.service.BookingService;
import com.ticketbroker.service.EmailService;
import com.ticketbroker.service.ExcelService;
import com.ticketbroker.service.PdfService;
import com.ticketbroker.service.SettingsService;
import com.ticketbroker.service.TicketService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminApiController {
    private final BookingRepository bookingRepository;
    private final TicketRepository ticketRepository;
    private final AuditLogRepository auditLogRepository;
    private final BookingService bookingService;
    private final TicketService ticketService;
    private final EmailService emailService;
    private final PdfService pdfService;
    private final ExcelService excelService;
    private final SettingsService settingsService;
    
    public AdminApiController(BookingRepository bookingRepository, TicketRepository ticketRepository,
                            AuditLogRepository auditLogRepository, BookingService bookingService,
                            TicketService ticketService, EmailService emailService,
                            PdfService pdfService, ExcelService excelService,
                            SettingsService settingsService) {
        this.bookingRepository = bookingRepository;
        this.ticketRepository = ticketRepository;
        this.auditLogRepository = auditLogRepository;
        this.bookingService = bookingService;
        this.ticketService = ticketService;
        this.emailService = emailService;
        this.pdfService = pdfService;
        this.excelService = excelService;
        this.settingsService = settingsService;
    }
    
    @GetMapping("/bookings")
    public ResponseEntity<List<BookingResponse>> getAllBookings() {
        List<Booking> bookings = bookingRepository.findAll();
        List<BookingResponse> responses = bookings.stream()
                .map(BookingResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }
    
    @PostMapping("/bookings/{id}/confirm-payment")
    public ResponseEntity<BookingResponse> confirmPayment(@PathVariable Long id,
                                                          @RequestParam(defaultValue = "admin") String adminUser) {
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
        bookingService.deleteBooking(id);
        return ResponseEntity.noContent().build();
    }
    
    @GetMapping("/tickets")
    public ResponseEntity<List<Map<String, Object>>> getAllTickets() {
        List<Ticket> tickets = ticketRepository.findAll();
        List<Map<String, Object>> responses = tickets.stream().map(ticket -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", ticket.getId());
            map.put("ticketReference", ticket.getTicketReference());
            map.put("ticketType", ticket.getTicketType());
            map.put("isUsed", ticket.getIsUsed());
            map.put("usedAt", ticket.getUsedAt());
            map.put("checkedBy", ticket.getCheckedBy());
            map.put("bookingReference", ticket.getBooking().getBookingReference());
            map.put("showTime", ticket.getShow().getStartTime() + "-" + ticket.getShow().getEndTime());
            return map;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }
    
    @PostMapping("/tickets/{id}/toggle-state")
    public ResponseEntity<Map<String, Object>> toggleTicketState(@PathVariable Long id,
                                                                 @RequestParam String checkerUser) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));
        
        ticketService.toggleTicketState(ticket, checkerUser);
        
        Map<String, Object> response = new HashMap<>();
        response.put("id", ticket.getId());
        response.put("isUsed", ticket.getIsUsed());
        return ResponseEntity.ok(response);
    }
    
    @DeleteMapping("/tickets/{id}")
    public ResponseEntity<Void> deleteTicket(@PathVariable Long id,
                                             @RequestParam(defaultValue = "admin") String adminUser,
                                             @RequestParam(required = false) String reason) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));
        
        ticketService.deleteTicket(ticket, adminUser, reason);
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
    
    @GetMapping("/audit")
    public ResponseEntity<Page<Map<String, Object>>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<com.ticketbroker.model.AuditLog> logs = auditLogRepository.findAllByOrderByTimestampDesc(pageable);
        
        Page<Map<String, Object>> responses = logs.map(log -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", log.getId());
            map.put("timestamp", log.getTimestamp());
            map.put("actionType", log.getActionType());
            map.put("entityType", log.getEntityType());
            map.put("entityId", log.getEntityId());
            map.put("userType", log.getUserType());
            map.put("userIdentifier", log.getUserIdentifier());
            map.put("details", log.getDetails());
            return map;
        });
        
        return ResponseEntity.ok(responses);
    }
    
    @GetMapping("/settings")
    public ResponseEntity<Map<String, String>> getSettings() {
        Map<String, String> settings = new HashMap<>();
        settings.put("concertName", settingsService.getValue("concert_name", "Klasskonsert 24C"));
        settings.put("welcomeMessage", settingsService.getValue("welcome_message", "Välkommen till 24c:s klasspelning!"));
        settings.put("concertDate", settingsService.getValue("concert_date", "29/1 2026"));
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
    
    @PostMapping(value = "/settings", consumes = {MediaType.MULTIPART_FORM_DATA_VALUE, MediaType.APPLICATION_JSON_VALUE})
    public ResponseEntity<Map<String, String>> updateSettings(
            @RequestParam(value = "concert_name", required = false) String concertName,
            @RequestParam(value = "welcome_message", required = false) String welcomeMessage,
            @RequestParam(value = "concert_date", required = false) String concertDate,
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
        if (concertName != null) settingsService.setValue("concert_name", concertName);
        if (welcomeMessage != null) settingsService.setValue("welcome_message", welcomeMessage);
        if (concertDate != null) settingsService.setValue("concert_date", concertDate);
        if (concertVenue != null) settingsService.setValue("concert_venue", concertVenue);
        if (adultPrice != null) settingsService.setValue("adult_ticket_price", adultPrice);
        if (studentPrice != null) settingsService.setValue("student_ticket_price", studentPrice);
        if (adultTicketLabel != null) settingsService.setValue("adult_ticket_label", adultTicketLabel);
        if (studentTicketLabel != null) settingsService.setValue("student_ticket_label", studentTicketLabel);
        if (swishNumber != null) settingsService.setValue("swish_number", swishNumber);
        if (swishRecipientName != null) settingsService.setValue("swish_recipient_name", swishRecipientName);
        if (contactEmail != null) settingsService.setValue("contact_email", contactEmail);
        if (adminEmail != null) settingsService.setValue("admin_email", adminEmail);
        if (maxTicketsPerBooking != null) settingsService.setValue("max_tickets_per_booking", maxTicketsPerBooking);
        
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
                logger.info("Class photo saved successfully - size: {} bytes, contentType: {}", photoBytes.length, contentType);
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
                logger.info("QR logo saved successfully - size: {} bytes, contentType: {}", logoBytes.length, contentType);
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
}

