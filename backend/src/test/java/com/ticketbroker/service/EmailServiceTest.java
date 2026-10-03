package com.ticketbroker.service;

import com.ticketbroker.model.Booking;
import com.ticketbroker.model.Show;
import com.ticketbroker.model.Ticket;
import jakarta.mail.BodyPart;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.LocalDate;
import java.util.List;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    private static final String INJECTED_LINK = "<a href=\"https://evil.example\">Betala här</a>";

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private SettingsService settingsService;

    private EmailService emailService;
    private Booking booking;

    @BeforeEach
    void setUp() {
        emailService = new EmailService(mailSender, settingsService);
        lenient().when(mailSender.createMimeMessage()).thenAnswer(inv -> new MimeMessage(Session.getInstance(new Properties())));
        lenient().when(settingsService.getValue(anyString(), anyString()))
                .thenAnswer(inv -> inv.getArgument(1));
        lenient().when(settingsService.getValue("concert_name", "Klasskonsert 24C")).thenReturn("Tjusés Klasskonsert");

        Show show = new Show();
        show.setDate(LocalDate.of(2026, 12, 1));
        show.setStartTime("18:00");
        show.setEndTime("19:00");

        booking = new Booking();
        booking.setShow(show);
        booking.setBookingReference("DPARV");
        booking.setFirstName("Anna");
        booking.setLastName("Svensson");
        booking.setEmail("anna@example.com");
        booking.setPhone("0701234567");
        booking.setAdultTickets(2);
        booking.setStudentTickets(1);
        booking.setTotalAmount(500);
        booking.setBuyerConfirmedPayment(false);
    }

    @Test
    void bookingConfirmation_ShouldEscapeVisitorTypedValues() throws Exception {
        booking.setFirstName(INJECTED_LINK);

        emailService.sendBookingConfirmation(booking, "https://24c.online/booking/success/DPARV/anna@example.com");

        String html = htmlOf(sentMessage());
        assertThat(html).doesNotContain("href=\"https://evil.example\"");
        assertThat(html).contains("&lt;a href=&quot;https://evil.example&quot;&gt;Betala här&lt;/a&gt;");
        assertThat(html).contains("href=\"https://24c.online/booking/success/DPARV/anna@example.com\"");
        assertThat(html).contains("Tjusés Klasskonsert");
    }

    @Test
    void paymentConfirmed_ShouldBeInSwedishAndEscapeValues() throws Exception {
        booking.setLastName(INJECTED_LINK);
        booking.getTickets().add(new Ticket());
        booking.getTickets().add(new Ticket());
        booking.getTickets().add(new Ticket());

        emailService.sendPaymentConfirmed(booking, new byte[] { 1 });

        MimeMessage message = sentMessage();
        assertThat(message.getSubject()).isEqualTo("Dina biljetter - Tjusés Klasskonsert (DPARV)");
        String html = htmlOf(message);
        assertThat(html).contains("BILJETTBEKRÄFTELSE", "Betalningen är bekräftad", "3 st", "1 dec 2026");
        assertThat(html).doesNotContain("Ticket Confirmation", "Please do not reply", "tickets");
        assertThat(html).doesNotContain("href=\"https://evil.example\"");
    }

    @Test
    void adminNotification_ShouldIncludeShowDate() throws Exception {
        emailService.sendAdminNotification(booking);

        String html = htmlOf(sentMessage());
        assertThat(html).contains("<strong>Datum:</strong> 1 dec 2026", "<strong>Tid:</strong> 18:00-19:00");
    }

    @Test
    void contactMessage_ShouldEscapeMessageButKeepLineBreaks() throws Exception {
        emailService.sendContactMessage(INJECTED_LINK, "a@example.com", "<b>070</b>", "Fråga",
                "Hej!\n<script>alert(1)</script>");

        String html = htmlOf(sentMessage());
        assertThat(html).doesNotContain("<script>", "<b>070</b>", "href=\"https://evil.example\"");
        assertThat(html).contains("Hej!<br>&lt;script&gt;alert(1)&lt;/script&gt;", "&lt;b&gt;070&lt;/b&gt;");
    }

    @Test
    void buyerPaymentNotice_ShouldEmbedTheReceiptAndGoToAllRecipients() throws Exception {
        booking.setFirstName(INJECTED_LINK);
        byte[] jpeg = { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 1, 2, 3 };

        emailService.sendBuyerPaymentNotice(EmailService.PaymentNotice.of(booking, jpeg, false),
                List.of("klasskonsertgruppen@gmail.com", "oliver.ahlstrand@icloud.com"), "https://24c.online/admin");

        MimeMessage message = sentMessage();
        assertThat(message.getSubject()).startsWith("Kvitto inskickat - DPARV (");
        assertThat(message.getAllRecipients()).extracting(Object::toString)
                .containsExactly("klasskonsertgruppen@gmail.com", "oliver.ahlstrand@icloud.com");
        String html = htmlOf(message);
        assertThat(html).contains("har skickat in ett kvitto för bokning <strong>DPARV</strong>", "cid:receipt",
                "Kontrollera att 500 kr har kommit in i Swish med meddelandet <strong>DPARV</strong>",
                "href=\"https://24c.online/admin\"", "1 dec 2026, 18:00-19:00");
        assertThat(html).doesNotContain("href=\"https://evil.example\"");
        assertThat(inlinePart(message, "<receipt>")).isNotNull();
    }

    @Test
    void buyerPaymentNotice_ShouldSayWhenNoReceiptWasSentOrWhenItWasReplaced() throws Exception {
        emailService.sendBuyerPaymentNotice(EmailService.PaymentNotice.of(booking, null, false),
                List.of("klasskonsertgruppen@gmail.com"), "https://24c.online/admin");
        MimeMessage withoutReceipt = sentMessage();
        assertThat(withoutReceipt.getSubject()).isEqualTo("Betalning anmäld - DPARV (Anna Svensson)");
        assertThat(htmlOf(withoutReceipt)).contains("utan att skicka in något kvitto").doesNotContain("cid:receipt");

        org.mockito.Mockito.clearInvocations(mailSender);
        emailService.sendBuyerPaymentNotice(EmailService.PaymentNotice.of(booking, new byte[] { 1 }, true),
                List.of("klasskonsertgruppen@gmail.com"), "https://24c.online/admin");
        assertThat(sentMessage().getSubject()).isEqualTo("Nytt kvitto - DPARV (Anna Svensson)");
    }

    @Test
    void buyerPaymentNotice_ShouldSendNothingWithoutRecipients() throws Exception {
        emailService.sendBuyerPaymentNotice(EmailService.PaymentNotice.of(booking, null, false), List.of(),
                "https://24c.online/admin");

        org.mockito.Mockito.verify(mailSender, org.mockito.Mockito.never()).send(org.mockito.ArgumentMatchers.any(MimeMessage.class));
    }

    private static Part inlinePart(Part part, String contentId) throws Exception {
        if (part instanceof jakarta.mail.internet.MimeBodyPart body && contentId.equals(body.getContentID())) {
            return part;
        }
        if (part.getContent() instanceof Multipart multipart) {
            for (int i = 0; i < multipart.getCount(); i++) {
                Part found = inlinePart(multipart.getBodyPart(i), contentId);
                if (found != null) {
                    return found;
                }
            }
        }
        return null;
    }

    private MimeMessage sentMessage() throws Exception {
        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());
        MimeMessage message = captor.getValue();
        // Content-Type headers are only filled in on save, which a real send would do
        message.saveChanges();
        return message;
    }

    private static String htmlOf(Part part) throws Exception {
        if (part.isMimeType("text/html")) {
            return (String) part.getContent();
        }
        if (part.getContent() instanceof Multipart multipart) {
            for (int i = 0; i < multipart.getCount(); i++) {
                BodyPart child = multipart.getBodyPart(i);
                String html = htmlOf(child);
                if (html != null) {
                    return html;
                }
            }
        }
        return null;
    }
}
