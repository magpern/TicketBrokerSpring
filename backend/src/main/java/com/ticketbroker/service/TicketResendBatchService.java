package com.ticketbroker.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.ticketbroker.model.Booking;
import com.ticketbroker.repository.BookingRepository;

/**
 * Re-sends ticket emails to every confirmed booking of a show, one at a time with a pause
 * in between so the mail server is not flooded. Runs in the background.
 */
@Service
public class TicketResendBatchService {
    private static final Logger logger = LoggerFactory.getLogger(TicketResendBatchService.class);

    private final BookingRepository bookingRepository;
    private final PdfService pdfService;
    private final EmailService emailService;
    private final AuditService auditService;
    private final TransactionTemplate transactionTemplate;
    private final long delayMillis;
    private final Set<Long> running = ConcurrentHashMap.newKeySet();

    public TicketResendBatchService(BookingRepository bookingRepository, PdfService pdfService,
            EmailService emailService, AuditService auditService, PlatformTransactionManager transactionManager,
            @Value("${app.ticket-resend.delay-ms:1000}") long delayMillis) {
        this.bookingRepository = bookingRepository;
        this.pdfService = pdfService;
        this.emailService = emailService;
        this.auditService = auditService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.delayMillis = delayMillis;
    }

    /** IDs of the confirmed bookings that have tickets, i.e. the ones a batch would email. */
    public List<Long> eligibleBookingIds(Long showId) {
        return transactionTemplate.execute(status -> bookingRepository.findConfirmedBookingsByShowId(showId).stream()
                .filter(b -> b.getTickets() != null && !b.getTickets().isEmpty())
                .map(Booking::getId)
                .toList());
    }

    /** Marks the show as running. Returns false if a batch for it is already in progress. */
    public boolean tryStart(Long showId) {
        return running.add(showId);
    }

    /** Caller must have got true from {@link #tryStart}. Releases the show when done. */
    @Async
    public void resendAll(Long showId, List<Long> bookingIds, String adminUser) {
        int sent = 0;
        int failed = 0;
        try {
            for (int i = 0; i < bookingIds.size(); i++) {
                if (i > 0) {
                    try {
                        Thread.sleep(delayMillis);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        logger.warn("Ticket resend for show {} interrupted after {} of {}", showId, i,
                                bookingIds.size());
                        break;
                    }
                }
                Long id = bookingIds.get(i);
                try {
                    // One transaction per booking: tickets are lazy and this is not a request thread.
                    transactionTemplate.executeWithoutResult(status -> {
                        Booking booking = bookingRepository.findById(id).orElseThrow();
                        try {
                            emailService.sendPaymentConfirmed(booking, pdfService.generateTicketsPdf(booking));
                        } catch (Exception e) {
                            throw new IllegalStateException(e);
                        }
                    });
                    sent++;
                } catch (Exception e) {
                    failed++;
                    logger.error("Failed to resend tickets for booking {} (show {})", id, showId, e);
                }
            }
        } finally {
            running.remove(showId);
            logger.info("Ticket resend for show {} finished: {} sent, {} failed", showId, sent, failed);
            Map<String, Object> details = new HashMap<>();
            details.put("showId", showId);
            details.put("sent", sent);
            details.put("failed", failed);
            auditService.logAuditEvent("tickets_batch_resent", "show", showId, "admin", adminUser, details, null,
                    null);
        }
    }
}
