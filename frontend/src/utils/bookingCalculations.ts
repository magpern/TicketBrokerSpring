/**
 * Utility functions for booking calculations
 * Extracted from components for testability
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
  type: 'adult' | 'student'
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

