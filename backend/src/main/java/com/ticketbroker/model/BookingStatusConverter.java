package com.ticketbroker.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class BookingStatusConverter implements AttributeConverter<BookingStatus, String> {
    
    @Override
    public String convertToDatabaseColumn(BookingStatus status) {
        if (status == null) {
            return null;
        }
        return status.name().toLowerCase();
    }
    
    @Override
    public BookingStatus convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        try {
            return BookingStatus.valueOf(dbData.toUpperCase());
        } catch (IllegalArgumentException e) {
            // Handle legacy data or invalid values
            // Try case-insensitive match
            for (BookingStatus status : BookingStatus.values()) {
                if (status.name().equalsIgnoreCase(dbData)) {
                    return status;
                }
            }
            throw new IllegalArgumentException("Unknown booking status: " + dbData);
        }
    }
}

