package com.ticketbroker.service;

import com.ticketbroker.model.Booking;
import com.ticketbroker.model.BookingStatus;
import com.ticketbroker.model.Show;
import com.ticketbroker.model.Ticket;
import com.ticketbroker.repository.BookingRepository;
import com.ticketbroker.repository.BuyerRepository;
import com.ticketbroker.repository.ShowRepository;
import com.ticketbroker.repository.TicketRepository;
import com.ticketbroker.util.BookingReferenceGenerator;
import com.ticketbroker.util.TicketReferenceGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Regression tests for duplicate ticket generation (issues #6 and #7).
 * Wires the real BookingService and TicketService against an in-memory ticket store,
 * so repeated confirmations are checked end to end rather than against mocked services.
 */
class PaymentConfirmationIdempotencyTest {

    private final List<Ticket> ticketStore = new ArrayList<>();
    private final AuditService auditService = mock(AuditService.class);

    private BookingService bookingService;
    private Booking booking;

    @BeforeEach
    void setUp() {
        Show show = new Show();
        show.setId(1L);
        show.setDate(LocalDate.now());
        show.setTotalTickets(100);
        show.setAvailableTickets(100);

        booking = new Booking();
        booking.setId(1L);
        booking.setShow(show);
        booking.setBookingReference("ABC123");
        booking.setFirstName("John");
        booking.setLastName("Doe");
        booking.setEmail("john@example.com");
        booking.setPhone("+46701234567");
        booking.setStatus(BookingStatus.RESERVED);

        BookingRepository bookingRepository = mock(BookingRepository.class);
        when(bookingRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));
        when(bookingRepository.findByShowId(1L)).thenAnswer(inv -> List.of(booking));

        ShowRepository showRepository = mock(ShowRepository.class);
        when(showRepository.save(any(Show.class))).thenAnswer(inv -> inv.getArgument(0));

        BuyerRepository buyerRepository = mock(BuyerRepository.class);
        when(buyerRepository.findByPhone(anyString())).thenReturn(Optional.empty());
        when(buyerRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        TicketRepository ticketRepository = mock(TicketRepository.class);
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> {
            Ticket ticket = inv.getArgument(0);
            ticket.setId((long) ticketStore.size() + 1);
            ticketStore.add(ticket);
            return ticket;
        });
        when(ticketRepository.findByBookingId(anyLong())).thenAnswer(inv -> ticketStore.stream()
                .filter(t -> t.getBooking().getId().equals(inv.getArgument(0)))
                .toList());

        TicketService ticketService = new TicketService(ticketRepository, buyerRepository,
                bookingRepository, showRepository, new TicketReferenceGenerator(), auditService);
        bookingService = new BookingService(bookingRepository, showRepository,
                mock(BookingReferenceGenerator.class), auditService, ticketService, ticketRepository);
    }

    @Test
    void oneAdult_confirmedOnce_createsOneTicket() {
        booking.setAdultTickets(1);
        booking.setStudentTickets(0);

        bookingService.confirmPaymentByAdmin(1L, "admin");

        assertThat(ticketStore).hasSize(1);
    }

    @Test
    void oneAdult_confirmedTwice_stillOneTicket() {
        booking.setAdultTickets(1);
        booking.setStudentTickets(0);

        BookingService.PaymentConfirmation first = bookingService.confirmPaymentByAdmin(1L, "admin");
        BookingService.PaymentConfirmation second = bookingService.confirmPaymentByAdmin(1L, "admin");

        assertThat(first.newlyConfirmed()).isTrue();
        assertThat(second.newlyConfirmed()).isFalse();
        assertThat(ticketStore).hasSize(1);
        verify(auditService, times(1)).logPaymentConfirmed(any(), anyString());
    }

    @Test
    void twoAdultsOneStudent_confirmedTwice_stillThreeTickets() {
        booking.setAdultTickets(2);
        booking.setStudentTickets(1);

        bookingService.confirmPaymentByAdmin(1L, "admin");
        bookingService.confirmPaymentByAdmin(1L, "admin");

        assertThat(ticketStore).hasSize(3);
        assertThat(ticketStore).extracting(Ticket::getTicketReference)
                .containsExactly("ABC123-N01", "ABC123-N02", "ABC123-D03");
    }

    @Test
    void updateBookingStatus_toConfirmed_generatesTicketsOnce() {
        booking.setAdultTickets(2);
        booking.setStudentTickets(1);

        Booking result = bookingService.updateBookingStatus(booking, BookingStatus.CONFIRMED, "admin");
        bookingService.confirmPaymentByAdmin(1L, "admin");

        assertThat(result.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(ticketStore).hasSize(3);
    }
}
