package com.ticketbroker.dto;

import com.ticketbroker.model.Show;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class ShowResponse {
    private Long id;
    private LocalDate date;
    private String startTime;
    private String endTime;
    private Integer totalTickets;
    private Integer availableTickets;
    private LocalDateTime createdAt;
    
    public static ShowResponse fromEntity(Show show) {
        ShowResponse response = new ShowResponse();
        response.setId(show.getId());
        response.setDate(show.getDate());
        response.setStartTime(show.getStartTime());
        response.setEndTime(show.getEndTime());
        response.setTotalTickets(show.getTotalTickets());
        response.setAvailableTickets(show.getAvailableTickets());
        response.setCreatedAt(show.getCreatedAt());
        return response;
    }
}

