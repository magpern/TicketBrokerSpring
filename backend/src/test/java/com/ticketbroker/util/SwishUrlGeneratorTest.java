package com.ticketbroker.util;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SwishUrlGeneratorTest {

    private SwishUrlGenerator generator;

    @BeforeEach
    void setUp() {
        generator = new SwishUrlGenerator();
    }

    @Test
    void generateSwishUrl_ShouldFormatUrlCorrectly() {
        // When
        String url = generator.generateSwishUrl("0123456789", 500, "ABC123");

        // Then
        assertThat(url).isEqualTo("https://app.swish.nu/1/p/sw/?sw=0123456789&amt=500&cur=SEK&msg=ABC123&src=qr");
    }

    @Test
    void generateSwishUrl_ShouldRemoveSpacesFromPhoneNumber() {
        // When
        String url = generator.generateSwishUrl("012 345 67 89", 500, "ABC123");

        // Then
        assertThat(url).contains("sw=0123456789");
        assertThat(url).doesNotContain(" ");
    }

    @Test
    void generateSwishUrl_ShouldRemoveDashesFromPhoneNumber() {
        // When
        String url = generator.generateSwishUrl("012-345-67-89", 500, "ABC123");

        // Then
        assertThat(url).contains("sw=0123456789");
        assertThat(url).doesNotContain("-");
    }

    @Test
    void generateSwishUrl_ShouldRemoveBothSpacesAndDashes() {
        // When
        String url = generator.generateSwishUrl("012 345-67 89", 500, "ABC123");

        // Then
        assertThat(url).contains("sw=0123456789");
        assertThat(url).doesNotContain(" ").doesNotContain("-");
    }

    @Test
    void generateSwishUrl_ShouldIncludeAllRequiredParameters() {
        // When
        String url = generator.generateSwishUrl("0123456789", 750, "XYZ789");

        // Then
        assertThat(url).contains("sw=0123456789");
        assertThat(url).contains("amt=750");
        assertThat(url).contains("cur=SEK");
        assertThat(url).contains("msg=XYZ789");
        assertThat(url).contains("src=qr");
    }

    @Test
    void generateSwishUrl_ShouldHandleZeroAmount() {
        // When
        String url = generator.generateSwishUrl("0123456789", 0, "ABC123");

        // Then
        assertThat(url).contains("amt=0");
    }

    @Test
    void generateSwishUrl_ShouldHandleLargeAmounts() {
        // When
        String url = generator.generateSwishUrl("0123456789", 999999, "ABC123");

        // Then
        assertThat(url).contains("amt=999999");
    }
}

