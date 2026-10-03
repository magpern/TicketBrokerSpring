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

let currentBooking: Record<string, unknown>

function renderPage(bookingData: Record<string, unknown>) {
  currentBooking = bookingData
  mockGet.mockImplementation((url: string) => {
    if (url === '/public/settings') return Promise.resolve({ data: { swishNumber: '0704910447' } })
    return Promise.resolve({ data: currentBooking })
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
    expect(screen.getByRole('button', { name: 'Kan du inte ladda upp? Markera som betald ändå' })).toBeInTheDocument()
  })

  it('offers the tickets for download instead of payment once the admin has confirmed', async () => {
    renderPage(booking({ status: 'confirmed', buyerConfirmedPayment: true }))

    expect(await screen.findByText(/Betalningen är bekräftad! Dina biljetter är klara/)).toBeInTheDocument()
    const download = screen.getByRole('link', { name: 'Ladda ner biljetter (PDF)' })
    expect(download).toHaveAttribute(
      'href',
      '/api/public/bookings/BUTE6/tickets.pdf?email=kerstinclamp%40gmail.com'
    )
    expect(screen.getByText('Totalt betalt:')).toBeInTheDocument()
    expect(screen.queryByText(/bekräfta din betalning/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Betala nu' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Har du inte swishat än\?/)).not.toBeInTheDocument()
  })

  it('does not offer a ticket download before the admin has confirmed', async () => {
    renderPage(booking({ buyerConfirmedPayment: true }))

    expect(await screen.findByRole('button', { name: 'Betala nu' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Ladda ner biljetter/ })).not.toBeInTheDocument()
  })

  it('uploads a Swish screenshot and then shows it as the uploaded receipt', async () => {
    renderPage(booking({}))
    const input = await screen.findByLabelText(/Ladda upp skärmdump/)

    mockPost.mockImplementation(() => {
      currentBooking = booking({ buyerConfirmedPayment: true, receiptUploadedAt: '2026-10-03T11:05:00' })
      return Promise.resolve({ data: { receiptUploadedAt: '2026-10-03T11:05:00' } })
    })
    const file = new File(['fake'], 'Screenshot.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText('Kvitto uppladdat')).toBeInTheDocument()
    const [url, body, config] = mockPost.mock.calls[0]
    expect(url).toBe('/public/bookings/BUTE6/receipt?email=kerstinclamp%40gmail.com')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('receipt')).toBeInstanceOf(Blob)
    expect(config.headers['Content-Type']).toBe('multipart/form-data')

    expect(screen.getByText(/Vi har fått ditt kvitto/)).toBeInTheDocument()
    expect(screen.getByAltText('Ditt uppladdade kvitto').getAttribute('src')).toContain(
      '/api/public/bookings/BUTE6/receipt?email=kerstinclamp%40gmail.com'
    )
    expect(screen.getByLabelText('Byt bild')).toBeInTheDocument()
    // Paying is still possible, but no longer the first step
    expect(screen.getByRole('button', { name: 'Betala nu' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Markera som betald ändå/ })).not.toBeInTheDocument()
  })

  it('shows the reason when the server rejects the upload', async () => {
    renderPage(booking({}))
    const input = await screen.findByLabelText(/Ladda upp skärmdump/)
    mockPost.mockRejectedValue({ response: { status: 400, data: { error: 'Filen är ingen bild.' } } })

    fireEvent.change(input, { target: { files: [new File(['x'], 'doc.pdf', { type: 'application/pdf' })] } })

    expect(await screen.findByRole('alert')).toHaveTextContent('Filen är ingen bild.')
    expect(screen.queryByText('Kvitto uppladdat')).not.toBeInTheDocument()
  })

  it('still lets someone without a screenshot mark the booking as paid', async () => {
    renderPage(booking({}))
    const fallback = await screen.findByRole('button', { name: 'Kan du inte ladda upp? Markera som betald ändå' })
    mockPost.mockImplementation(() => {
      currentBooking = booking({ buyerConfirmedPayment: true })
      return Promise.resolve({ data: {} })
    })

    fireEvent.click(fallback)

    expect(await screen.findByText(/Vi har fått din bekräftelse/)).toBeInTheDocument()
    expect(mockPost).toHaveBeenCalledWith('/public/bookings/BUTE6/confirm-payment?email=kerstinclamp@gmail.com')
    // Uploading afterwards is still offered
    expect(screen.getByLabelText(/Ladda upp skärmdump/)).toBeInTheDocument()
  })
})
