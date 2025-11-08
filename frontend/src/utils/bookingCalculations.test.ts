import { describe, it, expect } from 'vitest'

/**
 * Utility functions for booking calculations
 * These functions can be extracted from components and tested independently
 */

export function calculateTotalAmount(
  adultTickets: number,
  studentTickets: number,
  adultPrice: number = 200,
  studentPrice: number = 100
): number {
  return adultTickets * adultPrice + studentTickets * studentPrice
}

export function calculateTotalTickets(adultTickets: number, studentTickets: number): number {
  return adultTickets + studentTickets
}

export function canAddTicket(
  currentAdult: number,
  currentStudent: number,
  maxTickets: number,
  _type: 'adult' | 'student'
): boolean {
  const total = currentAdult + currentStudent
  return total < maxTickets
}

export function getNewTicketCount(
  currentValue: number,
  delta: number,
  maxTickets: number,
  otherTypeCount: number
): number {
  return Math.max(0, Math.min(maxTickets - otherTypeCount, currentValue + delta))
}

describe('Booking Calculations', () => {
  describe('calculateTotalAmount', () => {
    it('should calculate total amount correctly', () => {
      expect(calculateTotalAmount(2, 1, 200, 100)).toBe(500)
      expect(calculateTotalAmount(0, 0, 200, 100)).toBe(0)
      expect(calculateTotalAmount(1, 0, 200, 100)).toBe(200)
      expect(calculateTotalAmount(0, 1, 200, 100)).toBe(100)
    })

    it('should use default prices when not provided', () => {
      expect(calculateTotalAmount(2, 1)).toBe(500)
    })

    it('should handle custom prices', () => {
      expect(calculateTotalAmount(2, 1, 250, 150)).toBe(650)
    })
  })

  describe('calculateTotalTickets', () => {
    it('should calculate total tickets correctly', () => {
      expect(calculateTotalTickets(2, 1)).toBe(3)
      expect(calculateTotalTickets(0, 0)).toBe(0)
      expect(calculateTotalTickets(4, 0)).toBe(4)
      expect(calculateTotalTickets(0, 4)).toBe(4)
    })
  })

  describe('canAddTicket', () => {
    it('should return true when under max tickets', () => {
      expect(canAddTicket(2, 1, 4, 'adult')).toBe(true)
      expect(canAddTicket(2, 1, 4, 'student')).toBe(true)
    })

    it('should return false when at max tickets', () => {
      expect(canAddTicket(2, 2, 4, 'adult')).toBe(false)
      expect(canAddTicket(2, 2, 4, 'student')).toBe(false)
    })

    it('should return false when over max tickets', () => {
      expect(canAddTicket(3, 2, 4, 'adult')).toBe(false)
    })
  })

  describe('getNewTicketCount', () => {
    it('should increase count when delta is positive', () => {
      expect(getNewTicketCount(1, 1, 4, 0)).toBe(2)
    })

    it('should decrease count when delta is negative', () => {
      expect(getNewTicketCount(2, -1, 4, 0)).toBe(1)
    })

    it('should not go below zero', () => {
      expect(getNewTicketCount(0, -1, 4, 0)).toBe(0)
    })

    it('should respect max tickets limit', () => {
      expect(getNewTicketCount(2, 3, 4, 0)).toBe(4)
    })

    it('should account for other ticket type count', () => {
      expect(getNewTicketCount(2, 1, 4, 2)).toBe(2) // Max is 4, already have 2 student, so can only have 2 adult
    })
  })
})

