package com.ticketbroker.service;

import com.ticketbroker.model.Booking;
import com.ticketbroker.model.Ticket;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.Base64;
import java.util.Objects;

@Service
public class PdfService {
    private final QrCodeService qrCodeService;
    private final SettingsService settingsService;
    
    public PdfService(QrCodeService qrCodeService, SettingsService settingsService) {
        this.qrCodeService = qrCodeService;
        this.settingsService = settingsService;
    }
    
    public byte[] generateTicketsPdf(Booking booking) throws IOException {
        try (PDDocument document = new PDDocument()) {
            String concertName = settingsService.getValue("concert_name", "Klasskonsert 24C");
            // Get date from the show instead of settings
            LocalDate showDate = Objects.requireNonNull(booking.getShow(), "Booking show cannot be null")
                    .getDate();
            Objects.requireNonNull(showDate, "Show date cannot be null");
            String concertDate = formatDateForSwedish(showDate);
            String concertVenue = settingsService.getValue("concert_venue", "Aulan på Rytmus Stockholm");
            
            // Get logo if available
            byte[] logoBytes = null;
            String logoData = settingsService.getValue("qr_logo_data", null);
            if (logoData != null) {
                logoBytes = Base64.getDecoder().decode(logoData);
            }
            
            // Create a page for each ticket
            for (Ticket ticket : booking.getTickets()) {
                PDPage page = new PDPage(PDRectangle.A4);
                document.addPage(page);
                
                try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                    drawTicket(document, contentStream, page, ticket, booking, concertName, concertDate, concertVenue, logoBytes);
                }
            }
            
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        }
    }
    
    private String formatDateForSwedish(LocalDate date) {
        String[] months = {"jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"};
        return String.format("%d %s %d", date.getDayOfMonth(), months[date.getMonthValue() - 1], date.getYear());
    }
    
    private void drawTicket(PDDocument document, PDPageContentStream contentStream, PDPage page, 
                           Ticket ticket, Booking booking,
                           String concertName, String concertDate, String concertVenue,
                           byte[] logoBytes) throws IOException {
        PDRectangle pageSize = page.getMediaBox();
        float margin = 50;
        float y = pageSize.getHeight() - margin;
        
        PDType1Font titleFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
        PDType1Font normalFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        
        // Title
        contentStream.beginText();
        contentStream.setFont(titleFont, 28);
        contentStream.newLineAtOffset(margin, y);
        contentStream.showText(concertName);
        contentStream.endText();
        y -= 40;
        
        // Date
        contentStream.beginText();
        contentStream.setFont(normalFont, 18);
        contentStream.newLineAtOffset(margin, y);
        contentStream.showText(concertDate);
        contentStream.endText();
        y -= 30;
        
        // Booking info
        y -= 20;
        contentStream.beginText();
        contentStream.setFont(normalFont, 12);
        contentStream.newLineAtOffset(margin, y);
        contentStream.showText("Bokningsreferens: " + booking.getBookingReference());
        contentStream.endText();
        y -= 20;
        
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, y);
        contentStream.showText("Namn: " + booking.getFullName());
        contentStream.endText();
        y -= 20;
        
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, y);
        contentStream.showText("E-post: " + booking.getEmail());
        contentStream.endText();
        y -= 20;
        
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, y);
        contentStream.showText("Telefon: " + booking.getPhone());
        contentStream.endText();
        y -= 20;
        
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, y);
        contentStream.showText("Föreställning: " + booking.getShow().getStartTime() + "-" + booking.getShow().getEndTime());
        contentStream.endText();
        y -= 20;
        
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, y);
        contentStream.showText("Plats: " + concertVenue);
        contentStream.endText();
        y -= 40;
        
        // Ticket info
        String ticketType = "normal".equals(ticket.getTicketType()) ? "Ordinarie" : "Student";
        contentStream.beginText();
        contentStream.setFont(titleFont, 16);
        contentStream.newLineAtOffset(margin, y);
        contentStream.showText("BILJETT " + ticket.getTicketNumber() + "/" + booking.getTickets().size());
        contentStream.endText();
        y -= 20;
        
        contentStream.beginText();
        contentStream.setFont(normalFont, 14);
        contentStream.newLineAtOffset(margin, y);
        contentStream.showText("Typ: " + ticketType);
        contentStream.endText();
        y -= 20;
        
        contentStream.beginText();
        contentStream.setFont(normalFont, 12);
        contentStream.newLineAtOffset(margin, y);
        contentStream.showText("Referens: " + ticket.getTicketReference());
        contentStream.endText();
        y -= 40;
        
        // QR Code
        String qrCodeBase64;
        if (logoBytes != null) {
            qrCodeBase64 = qrCodeService.generateQrCodeWithLogoBase64(ticket.getTicketReference(), logoBytes);
        } else {
            qrCodeBase64 = qrCodeService.generateQrCodeBase64(ticket.getTicketReference());
        }
        
        byte[] qrCodeBytes = Base64.getDecoder().decode(qrCodeBase64);
        BufferedImage qrImage = ImageIO.read(new ByteArrayInputStream(qrCodeBytes));
        
        ByteArrayOutputStream qrBaos = new ByteArrayOutputStream();
        ImageIO.write(qrImage, "PNG", qrBaos);
        PDImageXObject qrCodeImage = PDImageXObject.createFromByteArray(
                document, qrBaos.toByteArray(), "qr-code");
        
        float qrSize = 150;
        contentStream.drawImage(qrCodeImage, margin, y - qrSize, qrSize, qrSize);
    }
}

