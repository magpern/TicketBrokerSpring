package com.ticketbroker.service;

import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.ticketbroker.model.Booking;

@Service
public class BookingNotificationService {
    private static final Logger logger = LoggerFactory.getLogger(BookingNotificationService.class);

    /** Settings key; anything but "false" means the administrator gets buyer-payment emails. */
    public static final String NOTIFY_ADMIN_SETTING = "notify_admin_on_buyer_payment";

    private final EmailService emailService;
    private final SettingsService settingsService;
    // The club's own Gmail account, the one all mail is sent from; it always gets a copy
    private final String groupAddress;
    private final String adminUrl;

    public BookingNotificationService(EmailService emailService, SettingsService settingsService,
            @Value("${spring.mail.username:}") String groupAddress, @Value("${app.base-url}") String appBaseUrl) {
        this.emailService = emailService;
        this.settingsService = settingsService;
        this.groupAddress = groupAddress == null ? "" : groupAddress.trim();
        this.adminUrl = appBaseUrl + "/admin";
    }

    @Async
    public void sendBuyerPaymentNotice(EmailService.PaymentNotice notice) {
        try {
            emailService.sendBuyerPaymentNotice(notice, buyerPaymentRecipients(), adminUrl);
        } catch (Exception e) {
            logger.error("Failed to send buyer payment notice for {}", notice.bookingReference(), e);
        }
    }

    List<String> buyerPaymentRecipients() {
        List<String> recipients = new ArrayList<>();
        if (!groupAddress.isEmpty()) {
            recipients.add(groupAddress);
        }
        if (!"false".equalsIgnoreCase(settingsService.getValue(NOTIFY_ADMIN_SETTING, "true"))) {
            String admin = settingsService.getValue("admin_email", "").trim();
            if (!admin.isEmpty() && recipients.stream().noneMatch(admin::equalsIgnoreCase)) {
                recipients.add(admin);
            }
        }
        return recipients;
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
