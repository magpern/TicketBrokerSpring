package com.ticketbroker.service;

import com.ticketbroker.model.Booking;
import com.ticketbroker.model.BookingReceipt;
import com.ticketbroker.repository.BookingReceiptRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.zip.CRC32;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReceiptServiceTest {

    @Mock
    private BookingReceiptRepository receiptRepository;

    @Mock
    private BookingService bookingService;

    @InjectMocks
    private ReceiptService receiptService;

    private Booking booking;

    @BeforeEach
    void setUp() {
        booking = new Booking();
        booking.setId(27L);
        booking.setBookingReference("BUTE6");
    }

    @Test
    void saveReceipt_ShouldStoreAScaledDownJpegAndMarkBookingPaidByBuyer() throws Exception {
        when(receiptRepository.findByBookingId(27L)).thenReturn(Optional.empty());

        ReceiptService.SavedReceipt result = receiptService.saveReceipt(booking, png(2160, 3840, BufferedImage.TYPE_INT_ARGB));
        LocalDateTime uploadedAt = result.uploadedAt();
        assertThat(result.replaced()).isFalse();

        ArgumentCaptor<BookingReceipt> saved = ArgumentCaptor.forClass(BookingReceipt.class);
        verify(receiptRepository).save(saved.capture());
        BookingReceipt receipt = saved.getValue();
        assertThat(receipt.getBookingId()).isEqualTo(27L);
        assertThat(receipt.getContentType()).isEqualTo("image/jpeg");
        assertThat(receipt.getUploadedAt()).isEqualTo(uploadedAt);

        BufferedImage stored = ImageIO.read(new ByteArrayInputStream(receipt.getImageData()));
        assertThat(stored).isNotNull();
        assertThat(Math.max(stored.getWidth(), stored.getHeight())).isEqualTo(ReceiptService.MAX_DIMENSION);
        assertThat(stored.getWidth()).isEqualTo(900);

        assertThat(booking.getReceiptUploadedAt()).isEqualTo(uploadedAt);
        verify(bookingService).confirmPaymentByBuyer(booking);
    }

    @Test
    void saveReceipt_ShouldReplaceAnEarlierReceipt() throws Exception {
        BookingReceipt existing = new BookingReceipt();
        existing.setId(5L);
        existing.setBookingId(27L);
        existing.setImageData(new byte[] { 1 });
        when(receiptRepository.findByBookingId(27L)).thenReturn(Optional.of(existing));

        ReceiptService.SavedReceipt result = receiptService.saveReceipt(booking, png(400, 800, BufferedImage.TYPE_INT_RGB));
        assertThat(result.replaced()).isTrue();

        ArgumentCaptor<BookingReceipt> saved = ArgumentCaptor.forClass(BookingReceipt.class);
        verify(receiptRepository).save(saved.capture());
        assertThat(saved.getValue().getId()).isEqualTo(5L);
        assertThat(saved.getValue().getImageData()).hasSizeGreaterThan(1);
    }

    @Test
    void saveReceipt_ShouldRejectFilesThatAreNotImages() {
        byte[] notAnImage = "<html><script>alert(1)</script></html>".getBytes(StandardCharsets.UTF_8);

        assertThatThrownBy(() -> receiptService.saveReceipt(booking, notAnImage))
                .isInstanceOf(ReceiptService.InvalidReceiptException.class);

        verify(receiptRepository, never()).save(any());
        verify(bookingService, never()).confirmPaymentByBuyer(any());
    }

    @Test
    void saveReceipt_ShouldRejectImagesWithHugeDimensionsWithoutDecodingThem() {
        // A valid PNG header claiming 50000x50000 pixels; decoding it would need ~10 GB
        byte[] bomb = pngHeaderOnly(50_000, 50_000);

        assertThatThrownBy(() -> receiptService.saveReceipt(booking, bomb))
                .isInstanceOf(ReceiptService.InvalidReceiptException.class)
                .hasMessageContaining("för stor");

        verify(receiptRepository, never()).save(any());
    }

    private static byte[] png(int width, int height, int type) throws Exception {
        BufferedImage image = new BufferedImage(width, height, type);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    private static byte[] pngHeaderOnly(int width, int height) {
        ByteBuffer ihdr = ByteBuffer.allocate(13).putInt(width).putInt(height)
                .put((byte) 8).put((byte) 2).put((byte) 0).put((byte) 0).put((byte) 0);
        byte[] type = "IHDR".getBytes(StandardCharsets.US_ASCII);
        CRC32 crc = new CRC32();
        crc.update(type);
        crc.update(ihdr.array());
        return ByteBuffer.allocate(8 + 4 + 4 + 13 + 4)
                .put(new byte[] { (byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n' })
                .putInt(13).put(type).put(ihdr.array()).putInt((int) crc.getValue())
                .array();
    }
}
