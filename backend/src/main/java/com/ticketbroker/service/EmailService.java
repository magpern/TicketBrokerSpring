package com.ticketbroker.service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Objects;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import com.ticketbroker.model.Booking;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {
    private final JavaMailSender mailSender;
    private final SettingsService settingsService;

    public EmailService(JavaMailSender mailSender, SettingsService settingsService) {
        this.mailSender = mailSender;
        this.settingsService = settingsService;
    }

    public void sendBookingConfirmation(Booking booking, String paymentUrl) throws MessagingException {
        String adminEmail = Objects.requireNonNull(
                settingsService.getValue("admin_email", "klasskonsertgruppen@gmail.com"), "Admin email cannot be null");
        String swishNumber = Objects.requireNonNull(settingsService.getValue("swish_number", "012 345 67 89"),
                "Swish number cannot be null");
        String concertName = Objects.requireNonNull(settingsService.getValue("concert_name", "Klasskonsert 24C"),
                "Concert name cannot be null");
        String bookingEmail = Objects.requireNonNull(booking.getEmail(), "Booking email cannot be null");
        String bookingReference = Objects.requireNonNull(booking.getBookingReference(),
                "Booking reference cannot be null");

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());

        helper.setFrom(adminEmail);
        helper.setTo(bookingEmail);
        helper.setSubject("Biljettreservation bekräftad - " + bookingReference);

        String htmlContent = buildBookingConfirmationEmail(booking, paymentUrl, swishNumber, concertName);
        Objects.requireNonNull(htmlContent, "HTML content cannot be null");
        helper.setText(htmlContent, true);

        mailSender.send(message);
    }

    public void sendPaymentConfirmed(Booking booking, byte[] pdfData) throws MessagingException {
        String concertName = Objects.requireNonNull(settingsService.getValue("concert_name", "Klasskonsert 24C"),
                "Concert name cannot be null");
        // Get date from the show instead of settings
        LocalDate showDate = Objects.requireNonNull(booking.getShow(), "Booking show cannot be null")
                .getDate();
        Objects.requireNonNull(showDate, "Show date cannot be null");
        String concertDate = formatDateForSwedish(showDate);
        String concertVenue = Objects.requireNonNull(
                settingsService.getValue("concert_venue", "Aulan på Rytmus Stockholm"), "Concert venue cannot be null");
        String contactEmail = Objects.requireNonNull(settingsService.getValue("contact_email", "admin@example.com"),
                "Contact email cannot be null");
        String bookingEmail = Objects.requireNonNull(booking.getEmail(), "Booking email cannot be null");
        String bookingReference = Objects.requireNonNull(booking.getBookingReference(),
                "Booking reference cannot be null");
        Objects.requireNonNull(pdfData, "PDF data cannot be null");

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());

        // Use noreply address for ticket emails with display name
        try {
            helper.setFrom("noreply@klasskonsertgruppen.eu", concertName);
        } catch (Exception e) {
            // Fallback if setFrom with name fails
            helper.setFrom("noreply@klasskonsertgruppen.eu");
        }
        helper.setTo(bookingEmail);
        helper.setReplyTo(contactEmail);
        helper.setSubject("Dina biljetter - " + concertName + " (" + bookingReference + ")");

        String htmlContent = buildPaymentConfirmedEmail(booking, concertName, concertDate, concertVenue, contactEmail);
        Objects.requireNonNull(htmlContent, "HTML content cannot be null");
        helper.setText(htmlContent, true);

        // Attach PDF
        helper.addAttachment("biljetter_" + bookingReference + ".pdf",
                new ByteArrayResource(pdfData));

        mailSender.send(message);
    }

    // Names, phone numbers and contact messages are typed by visitors; escape every value put
    // into the email HTML so nobody can inject links or markup into mail sent from our address.
    private static String esc(Object value) {
        return value == null ? "" : HtmlUtils.htmlEscape(value.toString(), StandardCharsets.UTF_8.name());
    }

    private String formatDateForSwedish(LocalDate date) {
        String[] months = { "jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec" };
        return String.format("%d %s %d", date.getDayOfMonth(), months[date.getMonthValue() - 1], date.getYear());
    }

    public void sendAdminNotification(Booking booking) throws MessagingException {
        String adminEmail = Objects.requireNonNull(settingsService.getValue("admin_email", "admin@example.com"),
                "Admin email cannot be null");
        String bookingReference = Objects.requireNonNull(booking.getBookingReference(),
                "Booking reference cannot be null");

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());

        helper.setFrom(adminEmail);
        helper.setTo(adminEmail);
        helper.setSubject("Ny biljettreservation - " + bookingReference);

        String htmlContent = buildAdminNotificationEmail(booking);
        Objects.requireNonNull(htmlContent, "HTML content cannot be null");
        helper.setText(htmlContent, true);

        mailSender.send(message);
    }

    private String buildBookingConfirmationEmail(Booking booking, String paymentUrl,
            String swishNumber, String concertName) {
        return String.format(
                """
                        <h2>Tack för din reservation!</h2>
                        <p>Hej %s,</p>
                        <p>Din biljettreservation för %s har bekräftats.</p>

                        <h3>Din bokningsreferens: <strong>%s</strong></h3>

                        <h3>Reservationsdetaljer:</h3>
                        <ul>
                            <li><strong>Namn:</strong> %s</li>
                            <li><strong>E-post:</strong> %s</li>
                            <li><strong>Telefon:</strong> %s</li>
                            <li><strong>Datum:</strong> %s</li>
                            <li><strong>Tid:</strong> %s-%s</li>
                            <li><strong>Ordinariebiljetter:</strong> %d st</li>
                            <li><strong>Studentbiljetter:</strong> %d st</li>
                            <li><strong>Totalt att betala:</strong> %d kr</li>
                        </ul>

                        <h3>Viktigt - Betalning krävs!</h3>
                        <p>Du har reserverat en plats först när du BÅDE har reserverat en biljett här på hemsidan - och du har swishat summan till <strong>%s</strong>.</p>

                        <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                            <p style="margin: 0; font-weight: 500; color: #1e40af;"><strong>OBS:</strong> Om du redan betalat så behöver du inte betala igen, utan avvakta bekräftelse från arrangören.</p>
                        </div>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="%s" style="background-color: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Betala nu</a>
                        </div>

                        <p>Eller klicka på denna länk för att komma till betalningssidan: <a href="%s">%s</a></p>

                        <p>Glöm inte att bekräfta din betalning på hemsidan efter att du har swishat!</p>

                        <p>Med vänliga hälsningar,<br>%s-gruppen</p>
                        """,
                esc(booking.getFirstName()),
                esc(concertName),
                esc(booking.getBookingReference()),
                esc(booking.getFullName()),
                esc(booking.getEmail()),
                esc(booking.getPhone()),
                booking.getShow().getDate() != null ? formatDateForSwedish(booking.getShow().getDate()) : "",
                esc(booking.getShow().getStartTime()),
                esc(booking.getShow().getEndTime()),
                booking.getAdultTickets(),
                booking.getStudentTickets(),
                booking.getTotalAmount(),
                esc(swishNumber),
                esc(paymentUrl),
                esc(paymentUrl),
                esc(paymentUrl),
                esc(concertName));
    }

    private String buildPaymentConfirmedEmail(Booking booking, String concertName,
            String concertDate, String concertVenue, String contactEmail) {
        return String.format(
                """
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Dina biljetter - %s</title>
                        </head>
                        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                     line-height: 1.6; color: #333333; background: #f8f9fa; margin: 0; padding: 0;">

                            <div style="max-width: 600px; margin: 0 auto; background: white;
                                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);">

                                <div style="background: #2c3e50; color: white; padding: 30px; text-align: center;">
                                    <h1 style="margin: 0; font-size: 24px; font-weight: 300; letter-spacing: 1px;">
                                        BILJETTBEKRÄFTELSE
                                    </h1>
                                    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; font-weight: 300;">
                                        %s • %s
                                    </p>
                                </div>

                                <div style="padding: 40px 30px;">
                                    <div style="text-align: center; margin-bottom: 40px;">
                                        <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #27ae60; font-weight: 400;">
                                            Betalningen är bekräftad
                                        </h2>
                                        <p style="margin: 0; font-size: 16px; color: #666; font-weight: 300;">
                                            Tack! Vi har tagit emot din betalning och dina biljetter är klara.
                                        </p>
                                    </div>

                                    <div style="background: #e8f5e8; border: 1px solid #27ae60; padding: 25px; margin-bottom: 30px;">
                                        <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #27ae60; font-weight: 600;">
                                            🎫 DINA BILJETTER
                                        </h3>
                                        <p style="margin: 0; font-size: 15px; color: #555; font-weight: 500;">
                                            Dina biljetter finns bifogade i detta mail som en PDF-fil. Varje biljett har en unik QR-kod som visas upp vid entrén.
                                        </p>
                                        <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">
                                            <strong>Viktigt:</strong> Spara den bifogade PDF-filen så att du har biljetterna med dig till konserten.
                                        </p>
                                    </div>

                                    <div style="background: #f8f9fa; border-left: 4px solid #3498db; padding: 25px; margin-bottom: 30px;">
                                        <h3 style="margin: 0 0 20px 0; font-size: 16px; color: #2c3e50; font-weight: 500;">
                                            BOKNINGSDETALJER
                                        </h3>
                                        <table style="width: 100%%; border-collapse: collapse;">
                                            <tr>
                                                <td style="padding: 8px 0; font-weight: 500; color: #555; width: 140px;">Bokningsreferens:</td>
                                                <td style="padding: 8px 0; color: #333; font-family: monospace; font-size: 14px;">%s</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-weight: 500; color: #555;">Namn:</td>
                                                <td style="padding: 8px 0; color: #333;">%s</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-weight: 500; color: #555;">E-post:</td>
                                                <td style="padding: 8px 0; color: #333;">%s</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-weight: 500; color: #555;">Telefon:</td>
                                                <td style="padding: 8px 0; color: #333;">%s</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-weight: 500; color: #555;">Biljetter:</td>
                                                <td style="padding: 8px 0; color: #333;">%d st</td>
                                            </tr>
                                        </table>
                                    </div>

                                    <div style="background: #f8f9fa; padding: 25px; margin-bottom: 30px;">
                                        <h3 style="margin: 0 0 20px 0; font-size: 16px; color: #2c3e50; font-weight: 500;">
                                            KONSERTINFORMATION
                                        </h3>
                                        <table style="width: 100%%; border-collapse: collapse;">
                                            <tr>
                                                <td style="padding: 8px 0; font-weight: 500; color: #555; width: 80px;">Datum:</td>
                                                <td style="padding: 8px 0; color: #333;">%s</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-weight: 500; color: #555;">Tid:</td>
                                                <td style="padding: 8px 0; color: #333;">%s - %s</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-weight: 500; color: #555;">Plats:</td>
                                                <td style="padding: 8px 0; color: #333;">%s</td>
                                            </tr>
                                        </table>
                                    </div>
                                </div>

                                <div style="background: #34495e; color: white; padding: 25px; text-align: center;">
                                    <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 300;">
                                        Har du frågor? Svara på detta mail eller kontakta oss på %s.
                                    </p>
                                    <p style="margin: 0; font-size: 12px; opacity: 0.8; font-weight: 300;">
                                        Detta mail skickades automatiskt när din betalning bekräftades.
                                    </p>
                                </div>
                            </div>
                        </body>
                        </html>
                        """,
                esc(concertName),
                esc(concertName),
                esc(concertDate),
                esc(booking.getBookingReference()),
                esc(booking.getFullName()),
                esc(booking.getEmail()),
                esc(booking.getPhone()),
                booking.getTickets().size(),
                esc(concertDate),
                esc(booking.getShow().getStartTime()),
                esc(booking.getShow().getEndTime()),
                esc(concertVenue),
                esc(contactEmail));
    }

    private String buildAdminNotificationEmail(Booking booking) {
        return String.format("""
                <h2>Ny biljettreservation</h2>
                <p>En ny biljettreservation har gjorts:</p>

                <h3>Bokningsreferens: <strong>%s</strong></h3>

                <h3>Reservationsdetaljer:</h3>
                <ul>
                    <li><strong>Namn:</strong> %s</li>
                    <li><strong>E-post:</strong> %s</li>
                    <li><strong>Telefon:</strong> %s</li>
                    <li><strong>Datum:</strong> %s</li>
                    <li><strong>Tid:</strong> %s-%s</li>
                    <li><strong>Ordinariebiljetter:</strong> %d st</li>
                    <li><strong>Studentbiljetter:</strong> %d st</li>
                    <li><strong>Totalt att betala:</strong> %d kr</li>
                    <li><strong>Status:</strong> %s</li>
                </ul>

                <p>Logga in på adminpanelen för att hantera reservationen.</p>
                """,
                esc(booking.getBookingReference()),
                esc(booking.getFullName()),
                esc(booking.getEmail()),
                esc(booking.getPhone()),
                booking.getShow().getDate() != null ? formatDateForSwedish(booking.getShow().getDate()) : "",
                esc(booking.getShow().getStartTime()),
                esc(booking.getShow().getEndTime()),
                booking.getAdultTickets(),
                booking.getStudentTickets(),
                booking.getTotalAmount(),
                booking.getBuyerConfirmedPayment() ? "Betalning bekräftad av köpare" : "Väntar på betalning");
    }

    public void sendContactMessage(String name, String email, String phone, String subject, String message)
            throws MessagingException {
        String adminEmail = Objects.requireNonNull(
                settingsService.getValue("admin_email", "klasskonsertgruppen@gmail.com"), "Admin email cannot be null");
        String concertName = Objects.requireNonNull(settingsService.getValue("concert_name", "Klasskonsert 24C"),
                "Concert name cannot be null");
        Objects.requireNonNull(email, "Email cannot be null");
        Objects.requireNonNull(subject, "Subject cannot be null");
        Objects.requireNonNull(message, "Message cannot be null");

        MimeMessage mimeMessage = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, StandardCharsets.UTF_8.name());

        helper.setFrom(adminEmail);
        helper.setTo(adminEmail);
        helper.setReplyTo(email);
        helper.setSubject("Kontaktformulär: " + subject + " - " + concertName);

        String phoneInfo = phone != null && !phone.isEmpty()
                ? "<li><strong>Telefon:</strong> " + esc(phone) + "</li>"
                : "";

        String htmlContent = String.format("""
                <h2>Nytt meddelande från kontaktformuläret</h2>
                <p>Du har fått ett nytt meddelande från %s kontaktformulär.</p>

                <h3>Avsändaruppgifter:</h3>
                <ul>
                    <li><strong>Namn:</strong> %s</li>
                    <li><strong>E-post:</strong> %s</li>
                    %s
                    <li><strong>Ämne:</strong> %s</li>
                </ul>

                <h3>Meddelande:</h3>
                <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626;">
                    %s
                </div>

                <hr style="margin: 30px 0;">

                <p><strong>Svara direkt på detta e-postmeddelande för att svara till %s.</strong></p>

                <p>Meddelandet skickades från: %s kontaktformulär</p>
                """,
                esc(concertName), esc(name), esc(email), phoneInfo, esc(subject),
                esc(message).replace("\n", "<br>"), esc(name), esc(concertName));

        Objects.requireNonNull(htmlContent, "HTML content cannot be null");
        helper.setText(htmlContent, true);
        mailSender.send(mimeMessage);
    }
}
