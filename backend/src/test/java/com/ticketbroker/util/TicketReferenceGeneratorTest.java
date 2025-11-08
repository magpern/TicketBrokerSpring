package com.ticketbroker.util;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TicketReferenceGeneratorTest {

    private TicketReferenceGenerator generator;

    @BeforeEach
    void setUp() {
        generator = new TicketReferenceGenerator();
    }

    @Test
    void generateTicketReference_ShouldFormatNormalTicketCorrectly() {
        // When
        String reference = generator.generateTicketReference("ABC123", "normal", 1);

        // Then
        assertThat(reference).isEqualTo("ABC123-N01");
    }

    @Test
    void generateTicketReference_ShouldFormatStudentTicketCorrectly() {
        // When
        String reference = generator.generateTicketReference("ABC123", "student", 1);

        // Then
        assertThat(reference).isEqualTo("ABC123-D01");
    }

    @Test
    void generateTicketReference_ShouldPadTicketNumberWithZero() {
        // When
        String reference = generator.generateTicketReference("ABC123", "normal", 5);

        // Then
        assertThat(reference).isEqualTo("ABC123-N05");
    }

    @Test
    void generateTicketReference_ShouldHandleDoubleDigitTicketNumbers() {
        // When
        String reference = generator.generateTicketReference("ABC123", "normal", 15);

        // Then
        assertThat(reference).isEqualTo("ABC123-N15");
    }

    @Test
    void generateTicketReference_ShouldIncludeBookingReference() {
        // When
        String reference = generator.generateTicketReference("XYZ789", "normal", 3);

        // Then
        assertThat(reference).startsWith("XYZ789");
    }
}

