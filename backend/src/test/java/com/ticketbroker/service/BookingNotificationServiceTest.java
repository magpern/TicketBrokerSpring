package com.ticketbroker.service;

import com.ticketbroker.model.Booking;
import jakarta.mail.MessagingException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class BookingNotificationServiceTest {

    @Mock
    private EmailService emailService;

    @Mock
    private SettingsService settingsService;

    private BookingNotificationService bookingNotificationService;

    @BeforeEach
    void setUp() {
        bookingNotificationService = new BookingNotificationService(emailService, settingsService,
                "klasskonsertgruppen@gmail.com", "https://24c.online");
        lenient().when(settingsService.getValue(BookingNotificationService.NOTIFY_ADMIN_SETTING, "true")).thenReturn("true");
        lenient().when(settingsService.getValue("admin_email", "")).thenReturn("oliver.ahlstrand@icloud.com");
    }

    @Test
    void buyerPaymentNotice_ShouldGoToTheGroupAccountAndTheAdministrator() throws Exception {
        EmailService.PaymentNotice notice = notice();

        bookingNotificationService.sendBuyerPaymentNotice(notice);

        verify(emailService).sendBuyerPaymentNotice(notice,
                List.of("klasskonsertgruppen@gmail.com", "oliver.ahlstrand@icloud.com"), "https://24c.online/admin");
    }

    @Test
    void buyerPaymentNotice_ShouldSkipTheAdministratorWhoOptedOut() {
        lenient().when(settingsService.getValue(BookingNotificationService.NOTIFY_ADMIN_SETTING, "true")).thenReturn("false");

        assertThat(bookingNotificationService.buyerPaymentRecipients()).containsExactly("klasskonsertgruppen@gmail.com");
    }

    @Test
    void buyerPaymentNotice_ShouldNotEmailTheSameAddressTwice() {
        lenient().when(settingsService.getValue("admin_email", "")).thenReturn("  KlassKonsertGruppen@gmail.com ");

        assertThat(bookingNotificationService.buyerPaymentRecipients()).containsExactly("klasskonsertgruppen@gmail.com");
    }

    @Test
    void buyerPaymentNotice_ShouldLogAndNotThrowWhenSendingFails() throws Exception {
        doThrow(new MessagingException("smtp down")).when(emailService)
                .sendBuyerPaymentNotice(any(), any(), eq("https://24c.online/admin"));

        assertThatCode(() -> bookingNotificationService.sendBuyerPaymentNotice(notice())).doesNotThrowAnyException();
    }

    private static EmailService.PaymentNotice notice() {
        return new EmailService.PaymentNotice("BUTE6", "Shirley Clamp", "kerstinclamp@gmail.com", "0707424174",
                null, "18:00", "19:00", 2, 0, 400, null, false);
    }

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
