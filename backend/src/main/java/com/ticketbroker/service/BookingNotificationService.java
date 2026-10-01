package com.ticketbroker.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.ticketbroker.model.Booking;

@Service
public class BookingNotificationService {
    private static final Logger logger = LoggerFactory.getLogger(BookingNotificationService.class);

    private final EmailService emailService;

    public BookingNotificationService(EmailService emailService) {
        this.emailService = emailService;
    }

    // Runs off the request thread: SMTP takes seconds, and making the customer wait on it
    // made the booking page look stuck, which led to double-submitted bookings.
    @Async
    public void sendNewBookingEmails(Booking booking, String paymentUrl) {
        try {
            emailService.sendBookingConfirmation(booking, paymentUrl);
        } catch (Exception e) {
            logger.error("Failed to send booking confirmation for {}", booking.getBookingReference(), e);
        }
        try {
            emailService.sendAdminNotification(booking);
        } catch (Exception e) {
            logger.error("Failed to send admin notification for {}", booking.getBookingReference(), e);
        }
    }
}
