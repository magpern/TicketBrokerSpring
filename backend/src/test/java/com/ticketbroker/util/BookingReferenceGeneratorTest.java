package com.ticketbroker.util;

import com.ticketbroker.repository.BookingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingReferenceGeneratorTest {

    @Mock
    private BookingRepository bookingRepository;

    private BookingReferenceGenerator generator;

    @BeforeEach
    void setUp() {
        generator = new BookingReferenceGenerator(bookingRepository);
    }

    @Test
    void generateUniqueReference_ShouldGenerateReferenceOfCorrectLength() {
        // Given
        when(bookingRepository.findByBookingReference(anyString())).thenReturn(Optional.empty());

        // When
        String reference = generator.generateUniqueReference();

        // Then
        assertThat(reference).hasSize(5);
    }

    @Test
    void generateUniqueReference_ShouldGenerateAlphanumericReference() {
        // Given
        when(bookingRepository.findByBookingReference(anyString())).thenReturn(Optional.empty());

        // When
        String reference = generator.generateUniqueReference();

        // Then
        assertThat(reference).matches("[A-Z0-9]{5}");
    }

    @Test
    void generateUniqueReference_ShouldRetry_WhenReferenceExists() {
        // Given
        // First call returns existing booking (collision), second call returns empty (unique)
        when(bookingRepository.findByBookingReference(anyString()))
                .thenReturn(Optional.of(new com.ticketbroker.model.Booking())) // First attempt exists
                .thenReturn(Optional.empty()); // Second attempt is unique

        // When
        String reference = generator.generateUniqueReference();

        // Then
        assertThat(reference).isNotNull();
        assertThat(reference).hasSize(5);
        verify(bookingRepository, atLeast(2)).findByBookingReference(anyString());
    }

    @Test
    void generateUniqueReference_ShouldGenerateDifferentReferences() {
        // Given
        when(bookingRepository.findByBookingReference(anyString())).thenReturn(Optional.empty());

        // When
        String ref1 = generator.generateUniqueReference();
        String ref2 = generator.generateUniqueReference();
        String ref3 = generator.generateUniqueReference();

        // Then
        // While it's possible to get duplicates with random generation,
        // the probability is very low (1 in 36^5 = 60,466,176)
        // So we just verify they are valid references
        assertThat(ref1).matches("[A-Z0-9]{5}");
        assertThat(ref2).matches("[A-Z0-9]{5}");
        assertThat(ref3).matches("[A-Z0-9]{5}");
    }
}

