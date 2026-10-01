package com.ticketbroker.service;

import com.ticketbroker.model.Booking;
import jakarta.mail.MessagingException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class BookingNotificationServiceTest {

    @Mock
    private EmailService emailService;

    @InjectMocks
    private BookingNotificationService bookingNotificationService;

    @Test
    void sendNewBookingEmails_ShouldSendBothEmails() throws Exception {
        Booking booking = new Booking();
        booking.setBookingReference("ABC123");

        bookingNotificationService.sendNewBookingEmails(booking, "https://example.com/booking/success/ABC123/a@b.c");

        verify(emailService).sendBookingConfirmation(booking, "https://example.com/booking/success/ABC123/a@b.c");
        verify(emailService).sendAdminNotification(booking);
    }

    @Test
    void sendNewBookingEmails_ShouldStillNotifyAdmin_WhenConfirmationFails() throws Exception {
        Booking booking = new Booking();
        booking.setBookingReference("ABC123");
        doThrow(new MessagingException("smtp down")).when(emailService)
                .sendBookingConfirmation(booking, "url");

        assertThatCode(() -> bookingNotificationService.sendNewBookingEmails(booking, "url"))
                .doesNotThrowAnyException();

        verify(emailService).sendAdminNotification(booking);
    }
}
