package com.ticketbroker.service;

import com.ticketbroker.model.Booking;
import com.ticketbroker.model.BookingStatus;
import com.ticketbroker.model.Show;
import com.ticketbroker.model.Ticket;
import com.ticketbroker.repository.BookingRepository;
import com.ticketbroker.repository.ShowRepository;
import com.ticketbroker.repository.TicketRepository;
import com.ticketbroker.util.BookingReferenceGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private ShowRepository showRepository;

    @Mock
    private BookingReferenceGenerator bookingReferenceGenerator;

    @Mock
    private AuditService auditService;

    @Mock
    private TicketService ticketService;

    @Mock
    private TicketRepository ticketRepository;

    @InjectMocks
    private BookingService bookingService;

    private Show testShow;
    private Booking testBooking;

    @BeforeEach
    void setUp() {
        testShow = new Show();
        testShow.setId(1L);
        testShow.setDate(LocalDate.now());
        testShow.setStartTime("19:00");
        testShow.setEndTime("21:00");
        testShow.setTotalTickets(100);
        testShow.setAvailableTickets(50);

        testBooking = new Booking();
        testBooking.setId(1L);
        testBooking.setShow(testShow);
        testBooking.setFirstName("John");
        testBooking.setLastName("Doe");
        testBooking.setEmail("john@example.com");
        testBooking.setPhone("+46701234567");
        testBooking.setAdultTickets(2);
        testBooking.setStudentTickets(1);
        testBooking.setTotalAmount(500);
    }

    @Test
    void createBooking_ShouldCreateBooking_WhenShowExistsAndTicketsAvailable() {
        // Given
        when(showRepository.findById(1L)).thenReturn(Optional.of(testShow));
        when(bookingReferenceGenerator.generateUniqueReference()).thenReturn("ABC123");
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> {
            Booking booking = invocation.getArgument(0);
            booking.setId(1L);
            return booking;
        });

        // When
        Booking result = bookingService.createBooking(testBooking);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getBookingReference()).isEqualTo("ABC123");
        assertThat(result.getStatus()).isEqualTo(BookingStatus.RESERVED);
        assertThat(result.getCreatedAt()).isNotNull();
        assertThat(result.getShow()).isEqualTo(testShow);

        verify(showRepository).findById(1L);
        verify(bookingReferenceGenerator).generateUniqueReference();
        verify(bookingRepository).save(any(Booking.class));
        verify(auditService).logBookingCreated(any(Booking.class));
    }

    @Test
    void createBooking_ShouldThrowException_WhenShowNotFound() {
        // Given
        when(showRepository.findById(1L)).thenReturn(Optional.empty());

        // When/Then
        assertThatThrownBy(() -> bookingService.createBooking(testBooking))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Show not found");

        verify(showRepository).findById(1L);
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void createBooking_ShouldThrowException_WhenNotEnoughTicketsAvailable() {
        // Given
        testShow.setAvailableTickets(2); // Only 2 tickets available
        testBooking.setAdultTickets(2);
        testBooking.setStudentTickets(1); // Total 3 tickets needed
        when(showRepository.findById(1L)).thenReturn(Optional.of(testShow));

        // When/Then
        assertThatThrownBy(() -> bookingService.createBooking(testBooking))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Not enough tickets available");

        verify(showRepository).findById(1L);
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void createBooking_ShouldThrowException_WhenShowIsNull() {
        // Given
        testBooking.setShow(null);

        // When/Then
        assertThatThrownBy(() -> bookingService.createBooking(testBooking))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Booking show cannot be null");

        verify(showRepository, never()).findById(any());
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void updateBookingStatus_ShouldDeleteTickets_WhenChangingFromConfirmedToReserved() {
        // Given
        testBooking.setStatus(BookingStatus.CONFIRMED);
        List<Ticket> tickets = Arrays.asList(
                createTicket(1L, false),
                createTicket(2L, false)
        );
        when(ticketService.getTicketsForBooking(testBooking)).thenReturn(tickets);
        when(bookingRepository.findConfirmedBookingsByShowId(1L)).thenReturn(new ArrayList<>());
        when(showRepository.save(any(Show.class))).thenReturn(testShow);
        when(bookingRepository.save(any(Booking.class))).thenReturn(testBooking);

        // When
        Booking result = bookingService.updateBookingStatus(testBooking, BookingStatus.RESERVED, "admin");

        // Then
        assertThat(result.getStatus()).isEqualTo(BookingStatus.RESERVED);
        verify(ticketRepository, times(2)).delete(any(Ticket.class));
        verify(auditService, times(2)).logTicketDeleted(any(Ticket.class), eq("admin"), anyString());
        verify(showRepository).save(any(Show.class));
    }

    @Test
    void updateBookingStatus_ShouldThrowException_WhenChangingFromConfirmedWithUsedTickets() {
        // Given
        testBooking.setStatus(BookingStatus.CONFIRMED);
        List<Ticket> tickets = Arrays.asList(
                createTicket(1L, false),
                createTicket(2L, true) // One ticket is used
        );
        when(ticketService.getTicketsForBooking(testBooking)).thenReturn(tickets);

        // When/Then
        assertThatThrownBy(() -> bookingService.updateBookingStatus(testBooking, BookingStatus.RESERVED, "admin"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Cannot change status: booking has used tickets");

        verify(ticketRepository, never()).delete(any());
    }

    @Test
    void updateBookingStatus_ShouldGenerateTickets_WhenChangingToConfirmed() {
        // Given
        testBooking.setStatus(BookingStatus.RESERVED);
        when(bookingRepository.findConfirmedBookingsByShowId(1L)).thenReturn(new ArrayList<>());
        when(showRepository.save(any(Show.class))).thenReturn(testShow);
        when(bookingRepository.save(any(Booking.class))).thenReturn(testBooking);
        when(ticketService.generateTicketsForBooking(any(Booking.class))).thenReturn(new ArrayList<>());

        // When
        Booking result = bookingService.updateBookingStatus(testBooking, BookingStatus.CONFIRMED, "admin");

        // Then
        assertThat(result.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(result.getConfirmedAt()).isNotNull();
        verify(ticketService).generateTicketsForBooking(testBooking);
        verify(auditService).logPaymentConfirmed(testBooking, "admin");
        verify(showRepository).save(any(Show.class));
    }

    @Test
    void updateShowAvailability_ShouldCalculateCorrectly_WhenConfirmedBookingsExist() {
        // Given
        testShow.setTotalTickets(100);
        Booking booking1 = new Booking();
        booking1.setAdultTickets(2);
        booking1.setStudentTickets(1);
        Booking booking2 = new Booking();
        booking2.setAdultTickets(1);
        booking2.setStudentTickets(2);
        List<Booking> confirmedBookings = Arrays.asList(booking1, booking2);
        when(bookingRepository.findConfirmedBookingsByShowId(1L)).thenReturn(confirmedBookings);
        when(showRepository.save(any(Show.class))).thenReturn(testShow);

        // When
        bookingService.updateShowAvailability(testShow);

        // Then
        // Total booked: (2+1) + (1+2) = 6 tickets
        // Available: 100 - 6 = 94
        verify(showRepository).save(argThat(show -> show.getAvailableTickets() == 94));
    }

    @Test
    void updateShowAvailability_ShouldNeverGoBelowZero() {
        // Given
        testShow.setTotalTickets(10);
        Booking booking1 = new Booking();
        booking1.setAdultTickets(5);
        booking1.setStudentTickets(6); // Total 11, but only 10 available
        List<Booking> confirmedBookings = Arrays.asList(booking1);
        when(bookingRepository.findConfirmedBookingsByShowId(1L)).thenReturn(confirmedBookings);
        when(showRepository.save(any(Show.class))).thenReturn(testShow);

        // When
        bookingService.updateShowAvailability(testShow);

        // Then
        // Should be max(0, 10 - 11) = 0, not negative
        verify(showRepository).save(argThat(show -> show.getAvailableTickets() == 0));
    }

    @Test
    void confirmPaymentByAdmin_ShouldConfirmBookingAndGenerateTickets() {
        // Given
        testBooking.setStatus(BookingStatus.RESERVED);
        when(bookingRepository.save(any(Booking.class))).thenReturn(testBooking);
        when(bookingRepository.findConfirmedBookingsByShowId(1L)).thenReturn(new ArrayList<>());
        when(showRepository.save(any(Show.class))).thenReturn(testShow);
        when(ticketService.generateTicketsForBooking(any(Booking.class))).thenReturn(new ArrayList<>());

        // When
        Booking result = bookingService.confirmPaymentByAdmin(testBooking, "admin");

        // Then
        assertThat(result.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(result.getConfirmedAt()).isNotNull();
        verify(ticketService).generateTicketsForBooking(result);
        verify(auditService).logPaymentConfirmed(result, "admin");
        verify(showRepository).save(any(Show.class));
    }

    @Test
    void initiatePayment_ShouldSetPaymentInitiated() {
        // Given
        when(bookingRepository.save(any(Booking.class))).thenReturn(testBooking);

        // When
        bookingService.initiatePayment(testBooking);

        // Then
        assertThat(testBooking.getSwishPaymentInitiated()).isTrue();
        assertThat(testBooking.getSwishPaymentInitiatedAt()).isNotNull();
        verify(bookingRepository).save(testBooking);
        verify(auditService).logPaymentInitiated(testBooking);
    }

    @Test
    void confirmPaymentByBuyer_ShouldSetBuyerConfirmedPayment() {
        // Given
        when(bookingRepository.save(any(Booking.class))).thenReturn(testBooking);

        // When
        bookingService.confirmPaymentByBuyer(testBooking);

        // Then
        assertThat(testBooking.getBuyerConfirmedPayment()).isTrue();
        verify(bookingRepository).save(testBooking);
        verify(auditService).logBuyerConfirmedPayment(testBooking);
    }

    @Test
    void getBookingsByEmailAndLastName_ShouldLowercaseEmail() {
        // Given
        String email = "John@Example.com";
        String lastName = "Doe";
        List<Booking> expected = Arrays.asList(testBooking);
        when(bookingRepository.findByEmailAndLastName("john@example.com", lastName)).thenReturn(expected);

        // When
        List<Booking> result = bookingService.getBookingsByEmailAndLastName(email, lastName);

        // Then
        assertThat(result).isEqualTo(expected);
        verify(bookingRepository).findByEmailAndLastName("john@example.com", lastName);
    }

    private Ticket createTicket(Long id, boolean isUsed) {
        Ticket ticket = new Ticket();
        ticket.setId(id);
        ticket.setIsUsed(isUsed);
        ticket.setBooking(testBooking);
        return ticket;
    }
}

