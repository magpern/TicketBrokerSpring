import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'

const mockGet = vi.fn()
const mockPost = vi.fn()
vi.mock('../services/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}))

// Layout pulls in backend status checks that are irrelevant here
vi.mock('../components/Layout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

import BookingSuccessPage from './BookingSuccessPage'

function booking(overrides: Record<string, unknown>) {
  return {
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
    buyerConfirmedPayment: false,
    swishPaymentInitiated: false,
    show: { id: 1, date: '2026-11-17', startTime: '18:00', endTime: '19:00' },
    ...overrides,
  }
}

function renderPage(bookingData: Record<string, unknown>) {
  mockGet.mockImplementation((url: string) => {
    if (url === '/public/settings') return Promise.resolve({ data: { swishNumber: '0704910447' } })
    return Promise.resolve({ data: bookingData })
  })
  render(
    <MemoryRouter initialEntries={['/booking/success/BUTE6/kerstinclamp@gmail.com']}>
      <Routes>
        <Route path="/booking/success/:reference/:email" element={<BookingSuccessPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('BookingSuccessPage payment options', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
  })

  it('still lets a buyer pay after pressing "Jag har betalat" before actually paying', async () => {
    renderPage(booking({ buyerConfirmedPayment: true, swishPaymentInitiated: true }))

    expect(await screen.findByText(/Har du inte swishat än\?/)).toBeInTheDocument()
    const payNow = screen.getByRole('button', { name: 'Betala nu' })

    mockPost.mockResolvedValue({
      data: {
        swishNumber: '0704910447',
        swishRecipientName: 'Jimmy Ahlstrand',
        swishUrl: 'swish://payment',
        qrCodeData: 'data:image/png;base64,AAAA',
        isMobile: false,
      },
    })
    fireEvent.click(payNow)

    expect(await screen.findByAltText('Swish QR-kod')).toBeInTheDocument()
    expect(screen.getByText(/betala 400 kr till Jimmy Ahlstrand \(0704910447\)/)).toBeInTheDocument()
    expect(mockPost).toHaveBeenCalledWith('/public/bookings/BUTE6/initiate-payment?email=kerstinclamp@gmail.com')
    // Already marked as paid, so no second "I've paid" button
    expect(screen.queryByRole('button', { name: /Tryck här när du betalat/ })).not.toBeInTheDocument()
  })

  it('shows the real Swish number instead of a placeholder when the page is reloaded mid-payment', async () => {
    renderPage(booking({ swishPaymentInitiated: true }))

    expect(await screen.findByText(/Eller betala manuellt till 0704910447 med meddelandet BUTE6/)).toBeInTheDocument()
    expect(screen.queryByText(/012 345 67 89|Event Organizer/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tryck här när du betalat/ })).toBeInTheDocument()
  })

  it('hides payment options once the admin has confirmed the payment', async () => {
    renderPage(booking({ status: 'confirmed', buyerConfirmedPayment: true }))

    expect(await screen.findByText(/Betalning bekräftad! Dina biljetter är säkra/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Betala nu' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Har du inte swishat än\?/)).not.toBeInTheDocument()
  })
})
