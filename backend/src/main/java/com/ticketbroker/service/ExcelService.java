package com.ticketbroker.service;

import com.ticketbroker.model.Booking;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ExcelService {
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    
    public byte[] exportBookingsToExcel(List<Booking> bookings) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Bookings");
            
            // Create header row
            Row headerRow = sheet.createRow(0);
            String[] headers = {
                "ID", "Booking Reference", "First Name", "Last Name", "Email", "Phone",
                "Show Time", "Adult Tickets", "Student Tickets", "Total Amount",
                "Status", "Created At", "Confirmed At"
            };
            
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }
            
            // Create data rows
            int rowNum = 1;
            for (Booking booking : bookings) {
                Row row = sheet.createRow(rowNum++);
                
                row.createCell(0).setCellValue(booking.getId());
                row.createCell(1).setCellValue(booking.getBookingReference());
                row.createCell(2).setCellValue(booking.getFirstName());
                row.createCell(3).setCellValue(booking.getLastName());
                row.createCell(4).setCellValue(booking.getEmail());
                row.createCell(5).setCellValue(booking.getPhone());
                row.createCell(6).setCellValue(booking.getShow().getStartTime() + "-" + booking.getShow().getEndTime());
                row.createCell(7).setCellValue(booking.getAdultTickets());
                row.createCell(8).setCellValue(booking.getStudentTickets());
                row.createCell(9).setCellValue(booking.getTotalAmount());
                row.createCell(10).setCellValue(booking.getStatus() != null ? booking.getStatus().name().toLowerCase() : "");
                row.createCell(11).setCellValue(booking.getCreatedAt() != null ? 
                    booking.getCreatedAt().format(DATE_FORMATTER) : "");
                row.createCell(12).setCellValue(booking.getConfirmedAt() != null ? 
                    booking.getConfirmedAt().format(DATE_FORMATTER) : "");
            }
            
            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }
            
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            workbook.write(baos);
            return baos.toByteArray();
        }
    }
    
    public byte[] exportRevenueReport(List<Booking> bookings) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            // Summary sheet
            Sheet summarySheet = workbook.createSheet("Revenue Summary");
            
            // Calculate totals
            List<Booking> confirmedBookings = bookings.stream()
                    .filter(b -> b.getStatus() == com.ticketbroker.model.BookingStatus.CONFIRMED)
                    .toList();
            List<Booking> reservedBookings = bookings.stream()
                    .filter(b -> b.getStatus() != com.ticketbroker.model.BookingStatus.CONFIRMED)
                    .toList();
            
            int totalRevenue = confirmedBookings.stream()
                    .mapToInt(Booking::getTotalAmount)
                    .sum();
            int potentialRevenue = reservedBookings.stream()
                    .mapToInt(Booking::getTotalAmount)
                    .sum();
            
            int totalAdultTickets = confirmedBookings.stream()
                    .mapToInt(Booking::getAdultTickets)
                    .sum();
            int totalStudentTickets = confirmedBookings.stream()
                    .mapToInt(Booking::getStudentTickets)
                    .sum();
            int totalTicketsSold = totalAdultTickets + totalStudentTickets;
            
            // Summary data - matching Python structure
            int rowNum = 0;
            Row row = summarySheet.createRow(rowNum++);
            row.createCell(0).setCellValue("Revenue Report");
            row.createCell(1).setCellValue("Generated: " + java.time.LocalDateTime.now().format(DATE_FORMATTER));
            
            rowNum++; // Empty row
            row = summarySheet.createRow(rowNum++);
            row.createCell(0).setCellValue("SUMMARY");
            
            row = summarySheet.createRow(rowNum++);
            row.createCell(0).setCellValue("Total Bookings:");
            row.createCell(1).setCellValue(bookings.size());
            
            row = summarySheet.createRow(rowNum++);
            row.createCell(0).setCellValue("Confirmed Bookings:");
            row.createCell(1).setCellValue(confirmedBookings.size());
            
            row = summarySheet.createRow(rowNum++);
            row.createCell(0).setCellValue("Reserved Bookings:");
            row.createCell(1).setCellValue(reservedBookings.size());
            
            rowNum++; // Empty row
            row = summarySheet.createRow(rowNum++);
            row.createCell(0).setCellValue("REVENUE");
            
            row = summarySheet.createRow(rowNum++);
            row.createCell(0).setCellValue("Confirmed Revenue:");
            row.createCell(1).setCellValue(totalRevenue + " kr");
            
            row = summarySheet.createRow(rowNum++);
            row.createCell(0).setCellValue("Potential Revenue:");
            row.createCell(1).setCellValue(potentialRevenue + " kr");
            
            row = summarySheet.createRow(rowNum++);
            row.createCell(0).setCellValue("Total Potential:");
            row.createCell(1).setCellValue((totalRevenue + potentialRevenue) + " kr");
            
            rowNum++; // Empty row
            row = summarySheet.createRow(rowNum++);
            row.createCell(0).setCellValue("TICKET BREAKDOWN");
            
            row = summarySheet.createRow(rowNum++);
            row.createCell(0).setCellValue("Total Adult Tickets:");
            row.createCell(1).setCellValue(totalAdultTickets);
            
            row = summarySheet.createRow(rowNum++);
            row.createCell(0).setCellValue("Total Student Tickets:");
            row.createCell(1).setCellValue(totalStudentTickets);
            
            row = summarySheet.createRow(rowNum++);
            row.createCell(0).setCellValue("Total Tickets Sold:");
            row.createCell(1).setCellValue(totalTicketsSold);
            
            // Detailed bookings sheet
            Sheet detailsSheet = workbook.createSheet("Detailed Bookings");
            
            // Headers
            rowNum = 0;
            row = detailsSheet.createRow(rowNum++);
            String[] detailHeaders = {"Booking Ref", "Name", "Email", "Phone", "Show Time", 
                    "Adult Tickets", "Student Tickets", "Total Amount", "Status", 
                    "Payment Confirmed", "Created Date"};
            for (int i = 0; i < detailHeaders.length; i++) {
                row.createCell(i).setCellValue(detailHeaders[i]);
            }
            
            // Data
            for (Booking booking : bookings) {
                row = detailsSheet.createRow(rowNum++);
                row.createCell(0).setCellValue(booking.getBookingReference());
                row.createCell(1).setCellValue(booking.getFirstName() + " " + booking.getLastName());
                row.createCell(2).setCellValue(booking.getEmail());
                row.createCell(3).setCellValue(booking.getPhone());
                row.createCell(4).setCellValue(booking.getShow().getStartTime() + "-" + booking.getShow().getEndTime());
                row.createCell(5).setCellValue(booking.getAdultTickets());
                row.createCell(6).setCellValue(booking.getStudentTickets());
                row.createCell(7).setCellValue(booking.getTotalAmount());
                row.createCell(8).setCellValue(booking.getStatus() != null ? booking.getStatus().name().toLowerCase() : "");
                row.createCell(9).setCellValue(booking.getBuyerConfirmedPayment() ? "Yes" : "No");
                row.createCell(10).setCellValue(booking.getCreatedAt() != null ? 
                    booking.getCreatedAt().format(DATE_FORMATTER) : "");
            }
            
            // Auto-size columns for detailed bookings
            for (int i = 0; i < detailHeaders.length; i++) {
                detailsSheet.autoSizeColumn(i);
            }
            
            // Revenue by show sheet
            Sheet showSheet = workbook.createSheet("Revenue by Show");
            
            // Group by show
            java.util.Map<String, java.util.Map<String, Object>> showRevenue = new java.util.HashMap<>();
            for (Booking booking : bookings) {
                String showKey = booking.getShow().getStartTime() + "-" + booking.getShow().getEndTime();
                showRevenue.putIfAbsent(showKey, new java.util.HashMap<>());
                java.util.Map<String, Object> data = showRevenue.get(showKey);
                data.putIfAbsent("confirmedRevenue", 0);
                data.putIfAbsent("potentialRevenue", 0);
                data.putIfAbsent("confirmedBookings", 0);
                data.putIfAbsent("reservedBookings", 0);
                data.putIfAbsent("totalTickets", 0);
                
                if (booking.getStatus() == com.ticketbroker.model.BookingStatus.CONFIRMED) {
                    data.put("confirmedRevenue", (Integer) data.get("confirmedRevenue") + booking.getTotalAmount());
                    data.put("confirmedBookings", (Integer) data.get("confirmedBookings") + 1);
                } else {
                    data.put("potentialRevenue", (Integer) data.get("potentialRevenue") + booking.getTotalAmount());
                    data.put("reservedBookings", (Integer) data.get("reservedBookings") + 1);
                }
                data.put("totalTickets", (Integer) data.get("totalTickets") + booking.getAdultTickets() + booking.getStudentTickets());
            }
            
            // Show revenue headers
            rowNum = 0;
            row = showSheet.createRow(rowNum++);
            String[] showHeaders = {"Show Time", "Confirmed Revenue", "Potential Revenue", "Total Revenue", "Confirmed Bookings", "Reserved Bookings", "Total Tickets"};
            for (int i = 0; i < showHeaders.length; i++) {
                row.createCell(i).setCellValue(showHeaders[i]);
            }
            
            // Show revenue data
            for (java.util.Map.Entry<String, java.util.Map<String, Object>> entry : showRevenue.entrySet()) {
                row = showSheet.createRow(rowNum++);
                java.util.Map<String, Object> data = entry.getValue();
                int confirmedRev = (Integer) data.get("confirmedRevenue");
                int potentialRev = (Integer) data.get("potentialRevenue");
                
                row.createCell(0).setCellValue(entry.getKey());
                row.createCell(1).setCellValue(confirmedRev + " kr");
                row.createCell(2).setCellValue(potentialRev + " kr");
                row.createCell(3).setCellValue((confirmedRev + potentialRev) + " kr");
                row.createCell(4).setCellValue((Integer) data.get("confirmedBookings"));
                row.createCell(5).setCellValue((Integer) data.get("reservedBookings"));
                row.createCell(6).setCellValue((Integer) data.get("totalTickets"));
            }
            
            // Auto-size columns
            for (int i = 0; i < showHeaders.length; i++) {
                showSheet.autoSizeColumn(i);
            }
            
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            workbook.write(baos);
            return baos.toByteArray();
        }
    }
}

