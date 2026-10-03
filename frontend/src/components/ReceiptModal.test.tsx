import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const mockGet = vi.fn()
vi.mock('../services/adminApi', () => ({
  default: { get: (...args: unknown[]) => mockGet(...args) },
}))

import ReceiptModal from './ReceiptModal'
import { BookingResponse } from '../types/booking'

const booking = {
  id: 27,
  bookingReference: 'BUTE6',
  firstName: 'Shirley',
  lastName: 'Clamp',
  email: 'kerstinclamp@gmail.com',
  phone: '0707424174',
  adultTickets: 2,
  studentTickets: 0,
  totalAmount: 400,
  status: 'reserved',
  buyerConfirmedPayment: true,
  swishPaymentInitiated: true,
  swishPaymentInitiatedAt: null,
  receiptUploadedAt: '2026-10-03T11:05:00',
  createdAt: '2026-10-01T18:46:33',
  confirmedAt: null,
  show: { id: 1, date: '2026-11-17', startTime: '18:00', endTime: '19:00' },
} as unknown as BookingResponse

describe('ReceiptModal', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockGet.mockImplementation((url: string) => {
      if (url === '/settings') {
        return Promise.resolve({ data: { swishNumber: '0704910447', swishRecipientName: 'Jimmy Ahlstrand' } })
      }
      return Promise.resolve({ data: new Blob(['jpeg'], { type: 'image/jpeg' }) })
    })
    URL.createObjectURL = vi.fn(() => 'blob:receipt')
    URL.revokeObjectURL = vi.fn()
  })

  it('shows the receipt next to what it should match and confirms from the popup', async () => {
    const onConfirm = vi.fn()
    render(<ReceiptModal booking={booking} confirming={false} onConfirm={onConfirm} onClose={vi.fn()} />)

    expect(await screen.findByAltText('Kvitto för BUTE6')).toHaveAttribute('src', 'blob:receipt')
    expect(mockGet).toHaveBeenCalledWith('/bookings/27/receipt', { responseType: 'blob' })
    expect(screen.getByText('400 kr')).toBeInTheDocument()
    expect(await screen.findByText('Jimmy Ahlstrand (0704910447)')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '✓ Bekräfta betalning' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('does not offer to confirm an already confirmed booking', async () => {
    render(
      <ReceiptModal booking={{ ...booking, status: 'confirmed' }} confirming={false} onConfirm={vi.fn()} onClose={vi.fn()} />
    )

    expect(await screen.findByText('✓ Betalningen är redan bekräftad')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Bekräfta betalning/ })).not.toBeInTheDocument()
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<ReceiptModal booking={booking} confirming={false} onConfirm={vi.fn()} onClose={onClose} />)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
