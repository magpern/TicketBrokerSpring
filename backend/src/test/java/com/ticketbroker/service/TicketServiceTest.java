package com.ticketbroker.service;

import com.ticketbroker.model.Booking;
import com.ticketbroker.model.BookingStatus;
import com.ticketbroker.model.Buyer;
import com.ticketbroker.model.Show;
import com.ticketbroker.model.Ticket;
import com.ticketbroker.repository.BookingRepository;
import com.ticketbroker.repository.BuyerRepository;
import com.ticketbroker.repository.ShowRepository;
import com.ticketbroker.repository.TicketRepository;
import com.ticketbroker.util.TicketReferenceGenerator;
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
class TicketServiceTest {

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private BuyerRepository buyerRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private ShowRepository showRepository;

    @Mock
    private TicketReferenceGenerator ticketReferenceGenerator;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private TicketService ticketService;

    private Booking testBooking;
    private Show testShow;
    private Buyer testBuyer;

    @BeforeEach
    void setUp() {
        testShow = new Show();
        testShow.setId(1L);
        testShow.setDate(LocalDate.now());

        testBooking = new Booking();
        testBooking.setId(1L);
        testBooking.setShow(testShow);
        testBooking.setFirstName("John");
        testBooking.setLastName("Doe");
        testBooking.setEmail("john@example.com");
        testBooking.setPhone("+46701234567");
        testBooking.setAdultTickets(2);
        testBooking.setStudentTickets(1);
        testBooking.setStatus(BookingStatus.CONFIRMED);
        testBooking.setBookingReference("ABC123");

        testBuyer = new Buyer();
        testBuyer.setId(1L);
        testBuyer.setPhone("+46701234567");
        testBuyer.setFirstName("John");
        testBuyer.setLastName("Doe");
        testBuyer.setEmail("john@example.com");
    }

    @Test
    void generateTicketsForBooking_ShouldGenerateCorrectNumberOfTickets() {
        // Given
        when(buyerRepository.findByPhone("+46701234567")).thenReturn(Optional.empty());
        when(buyerRepository.save(any(Buyer.class))).thenReturn(testBuyer);
        when(ticketReferenceGenerator.generateTicketReference(eq("ABC123"), eq("normal"), anyInt()))
                .thenReturn("ABC123-N01", "ABC123-N02");
        when(ticketReferenceGenerator.generateTicketReference(eq("ABC123"), eq("student"), eq(3)))
                .thenReturn("ABC123-D03");
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(invocation -> {
            Ticket ticket = invocation.getArgument(0);
            ticket.setId((long) (Math.random() * 1000));
            return ticket;
        });

        // When
        List<Ticket> result = ticketService.generateTicketsForBooking(testBooking);

        // Then
        assertThat(result).hasSize(3); // 2 adult + 1 student
        assertThat(result.stream().filter(t -> "normal".equals(t.getTicketType()))).hasSize(2);
        assertThat(result.stream().filter(t -> "student".equals(t.getTicketType()))).hasSize(1);
        verify(ticketRepository, times(3)).save(any(Ticket.class));
        verify(auditService, times(3)).logTicketGenerated(any(Ticket.class), eq(testBooking));
    }

    @Test
    void generateTicketsForBooking_ShouldThrowException_WhenBookingNotConfirmed() {
        // Given
        testBooking.setStatus(BookingStatus.RESERVED);

        // When/Then
        assertThatThrownBy(() -> ticketService.generateTicketsForBooking(testBooking))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Can only generate tickets for confirmed bookings");

        verify(ticketRepository, never()).save(any());
    }

    @Test
    void generateTicketsForBooking_ShouldCreateBuyer_WhenBuyerDoesNotExist() {
        // Given
        when(buyerRepository.findByPhone("+46701234567")).thenReturn(Optional.empty());
        when(buyerRepository.save(any(Buyer.class))).thenReturn(testBuyer);
        when(ticketReferenceGenerator.generateTicketReference(anyString(), anyString(), anyInt()))
                .thenReturn("ABC123-N01");
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(invocation -> {
            Ticket ticket = invocation.getArgument(0);
            ticket.setId(1L);
            return ticket;
        });

        // When
        ticketService.generateTicketsForBooking(testBooking);

        // Then
        verify(buyerRepository).save(argThat(buyer ->
                buyer.getPhone().equals("+46701234567") &&
                buyer.getFirstName().equals("John") &&
                buyer.getLastName().equals("Doe") &&
                buyer.getEmail().equals("john@example.com")
        ));
    }

    @Test
    void generateTicketsForBooking_ShouldUpdateBuyer_WhenBuyerExists() {
        // Given
        Buyer existingBuyer = new Buyer();
        existingBuyer.setId(1L);
        existingBuyer.setPhone("+46701234567");
        existingBuyer.setFirstName("Old");
        existingBuyer.setLastName("Name");
        existingBuyer.setEmail("old@example.com");

        when(buyerRepository.findByPhone("+46701234567")).thenReturn(Optional.of(existingBuyer));
        when(buyerRepository.save(any(Buyer.class))).thenReturn(existingBuyer);
        when(ticketReferenceGenerator.generateTicketReference(anyString(), anyString(), anyInt()))
                .thenReturn("ABC123-N01");
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(invocation -> {
            Ticket ticket = invocation.getArgument(0);
            ticket.setId(1L);
            return ticket;
        });

        // When
        ticketService.generateTicketsForBooking(testBooking);

        // Then
        verify(buyerRepository).save(argThat(buyer ->
                buyer.getFirstName().equals("John") &&
                buyer.getLastName().equals("Doe") &&
                buyer.getEmail().equals("john@example.com")
        ));
    }

    @Test
    void markTicketAsUsed_ShouldMarkTicketAsUsed() {
        // Given
        Ticket ticket = new Ticket();
        ticket.setId(1L);
        ticket.setIsUsed(false);
        when(ticketRepository.save(any(Ticket.class))).thenReturn(ticket);

        // When
        ticketService.markTicketAsUsed(ticket, "checker");

        // Then
        assertThat(ticket.getIsUsed()).isTrue();
        assertThat(ticket.getUsedAt()).isNotNull();
        assertThat(ticket.getCheckedBy()).isEqualTo("checker");
        verify(ticketRepository).save(ticket);
        verify(auditService).logTicketUsed(ticket, "checker");
    }

    @Test
    void markTicketAsUsed_ShouldThrowException_WhenTicketAlreadyUsed() {
        // Given
        Ticket ticket = new Ticket();
        ticket.setId(1L);
        ticket.setIsUsed(true);

        // When/Then
        assertThatThrownBy(() -> ticketService.markTicketAsUsed(ticket, "checker"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Ticket is already used");

        verify(ticketRepository, never()).save(any());
    }

    @Test
    void toggleTicketState_ShouldToggleFromUnusedToUsed() {
        // Given
        Ticket ticket = new Ticket();
        ticket.setId(1L);
        ticket.setIsUsed(false);
        when(ticketRepository.save(any(Ticket.class))).thenReturn(ticket);

        // When
        ticketService.toggleTicketState(ticket, "checker");

        // Then
        assertThat(ticket.getIsUsed()).isTrue();
        assertThat(ticket.getUsedAt()).isNotNull();
        assertThat(ticket.getCheckedBy()).isEqualTo("checker");
        verify(ticketRepository).save(ticket);
    }

    @Test
    void toggleTicketState_ShouldToggleFromUsedToUnused() {
        // Given
        Ticket ticket = new Ticket();
        ticket.setId(1L);
        ticket.setIsUsed(true);
        ticket.setUsedAt(java.time.LocalDateTime.now());
        ticket.setCheckedBy("checker");
        when(ticketRepository.save(any(Ticket.class))).thenReturn(ticket);

        // When
        ticketService.toggleTicketState(ticket, "checker");

        // Then
        assertThat(ticket.getIsUsed()).isFalse();
        assertThat(ticket.getUsedAt()).isNull();
        assertThat(ticket.getCheckedBy()).isNull();
        verify(ticketRepository).save(ticket);
    }

    @Test
    void deleteTicket_ShouldDeleteTicketAndUpdateBooking() {
        // Given
        Ticket ticket = new Ticket();
        ticket.setId(1L);
        ticket.setIsUsed(false);
        ticket.setTicketType("normal");
        ticket.setBooking(testBooking);
        testBooking.setAdultTickets(2);
        testBooking.setStudentTickets(1);
        testBooking.setTotalAmount(500);
        testBooking.setStatus(BookingStatus.CONFIRMED);
        Show testShow = new Show();
        testShow.setId(1L);
        testBooking.setShow(testShow);

        when(bookingRepository.save(any(Booking.class))).thenReturn(testBooking);
        when(bookingRepository.findByShowId(1L)).thenReturn(new ArrayList<>());
        when(showRepository.save(any(Show.class))).thenReturn(testShow);

        // When
        ticketService.deleteTicket(ticket, "admin", "Test reason");

        // Then
        assertThat(testBooking.getAdultTickets()).isEqualTo(1); // Reduced by 1
        assertThat(testBooking.getTotalAmount()).isEqualTo(300); // (1*200) + (1*100)
        verify(bookingRepository).save(testBooking);
        verify(ticketRepository).delete(ticket);
        verify(auditService).logTicketDeleted(ticket, "admin", "Test reason");
    }

    @Test
    void deleteTicket_ShouldThrowException_WhenTicketIsUsed() {
        // Given
        Ticket ticket = new Ticket();
        ticket.setId(1L);
        ticket.setIsUsed(true);

        // When/Then
        assertThatThrownBy(() -> ticketService.deleteTicket(ticket, "admin", "reason"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Cannot delete used tickets");

        verify(ticketRepository, never()).delete(any());
    }

    @Test
    void deleteTicket_ShouldUpdateStudentTicketCount_WhenDeletingStudentTicket() {
        // Given
        Ticket ticket = new Ticket();
        ticket.setId(1L);
        ticket.setIsUsed(false);
        ticket.setTicketType("student");
        ticket.setBooking(testBooking);
        testBooking.setAdultTickets(2);
        testBooking.setStudentTickets(2);
        testBooking.setTotalAmount(600);
        testBooking.setStatus(BookingStatus.CONFIRMED);
        Show testShow = new Show();
        testShow.setId(1L);
        testBooking.setShow(testShow);

        when(bookingRepository.save(any(Booking.class))).thenReturn(testBooking);
        when(bookingRepository.findByShowId(1L)).thenReturn(new ArrayList<>());
        when(showRepository.save(any(Show.class))).thenReturn(testShow);

        // When
        ticketService.deleteTicket(ticket, "admin", "reason");

        // Then
        assertThat(testBooking.getStudentTickets()).isEqualTo(1); // Reduced by 1
        assertThat(testBooking.getAdultTickets()).isEqualTo(2); // Unchanged
        verify(bookingRepository).save(testBooking);
    }
}

