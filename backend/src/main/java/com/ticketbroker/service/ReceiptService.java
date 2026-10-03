package com.ticketbroker.service;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Iterator;
import java.util.Optional;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticketbroker.model.Booking;
import com.ticketbroker.model.BookingReceipt;
import com.ticketbroker.repository.BookingReceiptRepository;

@Service
public class ReceiptService {
    static final int MAX_DIMENSION = 1600;
    // Checked before decoding so a small file claiming huge dimensions can't exhaust memory
    static final long MAX_SOURCE_PIXELS = 40_000_000L;

    public static class InvalidReceiptException extends RuntimeException {
        public InvalidReceiptException(String message) {
            super(message);
        }
    }

    private final BookingReceiptRepository receiptRepository;
    private final BookingService bookingService;

    public ReceiptService(BookingReceiptRepository receiptRepository, BookingService bookingService) {
        this.receiptRepository = receiptRepository;
        this.bookingService = bookingService;
    }

    /**
     * Stores the buyer's payment screenshot (replacing any earlier one) and marks the booking
     * as paid by the buyer. The image is decoded and re-encoded as JPEG, which rejects
     * anything that isn't an image and strips metadata such as GPS location.
     */
    @Transactional
    public LocalDateTime saveReceipt(Booking booking, byte[] upload) {
        byte[] jpeg = toJpeg(scaleDown(decode(upload)));
        LocalDateTime now = LocalDateTime.now();

        BookingReceipt receipt = receiptRepository.findByBookingId(booking.getId()).orElseGet(BookingReceipt::new);
        receipt.setBookingId(booking.getId());
        receipt.setContentType("image/jpeg");
        receipt.setImageData(jpeg);
        receipt.setUploadedAt(now);
        receiptRepository.save(receipt);

        booking.setReceiptUploadedAt(now);
        bookingService.confirmPaymentByBuyer(booking);
        return now;
    }

    public Optional<BookingReceipt> findReceipt(Long bookingId) {
        return receiptRepository.findByBookingId(bookingId);
    }

    private static BufferedImage decode(byte[] upload) {
        try (ImageInputStream in = ImageIO.createImageInputStream(new ByteArrayInputStream(upload))) {
            Iterator<ImageReader> readers = in == null ? null : ImageIO.getImageReaders(in);
            if (readers == null || !readers.hasNext()) {
                throw new InvalidReceiptException("Filen är ingen bild. Ladda upp en skärmdump (JPG eller PNG).");
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(in, true, true);
                if ((long) reader.getWidth(0) * reader.getHeight(0) > MAX_SOURCE_PIXELS) {
                    throw new InvalidReceiptException("Bilden är för stor.");
                }
                return reader.read(0);
            } finally {
                reader.dispose();
            }
        } catch (IOException e) {
            throw new InvalidReceiptException("Bilden kunde inte läsas. Ladda upp en skärmdump (JPG eller PNG).");
        }
    }

    private static BufferedImage scaleDown(BufferedImage source) {
        double scale = Math.min(1.0,
                (double) MAX_DIMENSION / Math.max(source.getWidth(), source.getHeight()));
        int width = Math.max(1, (int) Math.round(source.getWidth() * scale));
        int height = Math.max(1, (int) Math.round(source.getHeight() * scale));

        // Always draw onto an RGB canvas: JPEG has no alpha, and this normalises odd colour models
        BufferedImage target = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = target.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, width, height);
            g.drawImage(source, 0, 0, width, height, null);
        } finally {
            g.dispose();
        }
        return target;
    }

    private static byte[] toJpeg(BufferedImage image) {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ImageOutputStream ios = ImageIO.createImageOutputStream(out)) {
            writer.setOutput(ios);
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(0.85f);
            writer.write(null, new IIOImage(image, null, null), param);
        } catch (IOException e) {
            throw new IllegalStateException("Could not encode receipt image", e);
        } finally {
            writer.dispose();
        }
        return out.toByteArray();
    }
}
