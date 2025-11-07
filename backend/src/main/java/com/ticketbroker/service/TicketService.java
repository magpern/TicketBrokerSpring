package com.ticketbroker.service;

import com.ticketbroker.model.Booking;
import com.ticketbroker.model.Buyer;
import com.ticketbroker.model.Ticket;
import com.ticketbroker.repository.BookingRepository;
import com.ticketbroker.repository.BuyerRepository;
import com.ticketbroker.repository.TicketRepository;
import com.ticketbroker.util.TicketReferenceGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class TicketService {
    private final TicketRepository ticketRepository;
    private final BuyerRepository buyerRepository;
    private final BookingRepository bookingRepository;
    private final TicketReferenceGenerator ticketReferenceGenerator;
    private final AuditService auditService;
    
    public TicketService(TicketRepository ticketRepository, BuyerRepository buyerRepository,
                       BookingRepository bookingRepository, TicketReferenceGenerator ticketReferenceGenerator,
                       AuditService auditService) {
        this.ticketRepository = ticketRepository;
        this.buyerRepository = buyerRepository;
        this.bookingRepository = bookingRepository;
        this.ticketReferenceGenerator = ticketReferenceGenerator;
        this.auditService = auditService;
    }
    
    @Transactional
    public Buyer createOrUpdateBuyer(Booking booking) {
        Optional<Buyer> existing = buyerRepository.findByPhone(booking.getPhone());
        Buyer buyer;
        
        if (existing.isPresent()) {
            buyer = existing.get();
            buyer.setFirstName(booking.getFirstName());
            buyer.setLastName(booking.getLastName());
            buyer.setEmail(booking.getEmail());
            buyer.setUpdatedAt(LocalDateTime.now());
        } else {
            buyer = new Buyer();
            buyer.setPhone(booking.getPhone());
            buyer.setFirstName(booking.getFirstName());
            buyer.setLastName(booking.getLastName());
            buyer.setEmail(booking.getEmail());
        }
        
        return buyerRepository.save(buyer);
    }
    
    @Transactional
    public List<Ticket> generateTicketsForBooking(Booking booking) {
        if (booking.getStatus() != com.ticketbroker.model.BookingStatus.CONFIRMED) {
            throw new IllegalArgumentException("Can only generate tickets for confirmed bookings");
        }
        
        Buyer buyer = createOrUpdateBuyer(booking);
        List<Ticket> tickets = new ArrayList<>();
        int ticketNumber = 1;
        
        // Generate normal tickets
        for (int i = 0; i < booking.getAdultTickets(); i++) {
            String ticketRef = ticketReferenceGenerator.generateTicketReference(
                    booking.getBookingReference(), "normal", ticketNumber);
            
            Ticket ticket = new Ticket();
            ticket.setTicketReference(ticketRef);
            ticket.setBooking(booking);
            ticket.setShow(booking.getShow());
            ticket.setBuyer(buyer);
            ticket.setTicketType("normal");
            ticket.setTicketNumber(ticketNumber);
            
            ticket = ticketRepository.save(ticket);
            tickets.add(ticket);
            ticketNumber++;
        }
        
        // Generate student tickets
        for (int i = 0; i < booking.getStudentTickets(); i++) {
            String ticketRef = ticketReferenceGenerator.generateTicketReference(
                    booking.getBookingReference(), "student", ticketNumber);
            
            Ticket ticket = new Ticket();
            ticket.setTicketReference(ticketRef);
            ticket.setBooking(booking);
            ticket.setShow(booking.getShow());
            ticket.setBuyer(buyer);
            ticket.setTicketType("student");
            ticket.setTicketNumber(ticketNumber);
            
            ticket = ticketRepository.save(ticket);
            tickets.add(ticket);
            ticketNumber++;
        }
        
        // Log ticket generation
        for (Ticket ticket : tickets) {
            auditService.logTicketGenerated(ticket, booking);
        }
        
        return tickets;
    }
    
    public Optional<Ticket> findByReference(String ticketReference) {
        return ticketRepository.findByTicketReference(ticketReference);
    }
    
    public List<Ticket> getTicketsForBooking(Booking booking) {
        return ticketRepository.findByBookingId(booking.getId());
    }
    
    @Transactional
    public void markTicketAsUsed(Ticket ticket, String checkerUser) {
        if (ticket.getIsUsed()) {
            throw new IllegalArgumentException("Ticket is already used");
        }
        
        ticket.setIsUsed(true);
        ticket.setUsedAt(LocalDateTime.now());
        ticket.setCheckedBy(checkerUser);
        ticketRepository.save(ticket);
        
        auditService.logTicketUsed(ticket, checkerUser);
    }
    
    @Transactional
    public void toggleTicketState(Ticket ticket, String checkerUser) {
        if (ticket.getIsUsed()) {
            ticket.setIsUsed(false);
            ticket.setUsedAt(null);
            ticket.setCheckedBy(null);
        } else {
            ticket.setIsUsed(true);
            ticket.setUsedAt(LocalDateTime.now());
            ticket.setCheckedBy(checkerUser);
        }
        ticketRepository.save(ticket);
    }
    
    @Transactional
    public void deleteTicket(Ticket ticket, String adminUser, String reason) {
        if (ticket.getIsUsed()) {
            throw new IllegalArgumentException("Cannot delete used tickets");
        }
        
        Booking booking = ticket.getBooking();
        
        // Update booking counts
        if ("normal".equals(ticket.getTicketType())) {
            booking.setAdultTickets(booking.getAdultTickets() - 1);
        } else {
            booking.setStudentTickets(booking.getStudentTickets() - 1);
        }
        
        // Recalculate total amount (assuming prices from settings)
        booking.setTotalAmount((booking.getAdultTickets() * 200) + (booking.getStudentTickets() * 100));
        bookingRepository.save(booking);
        
        // Log deletion
        auditService.logTicketDeleted(ticket, adminUser, reason);
        
        // Delete ticket
        ticketRepository.delete(ticket);
    }
}

