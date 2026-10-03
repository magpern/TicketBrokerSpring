import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminBookingList from './AdminBookingList'
import { BookingResponse } from '../types/booking'

const evening = { id: 1, date: '2026-11-17', startTime: '19:00', endTime: '20:00' }

let nextId = 1
function booking(overrides: Partial<BookingResponse> & Record<string, unknown>): BookingResponse {
  const id = nextId++
  return {
    id,
    bookingReference: `REF${id}`,
    firstName: 'Test',
    lastName: `Person${id}`,
    email: `person${id}@example.com`,
    phone: '0700000000',
    adultTickets: 1,
    studentTickets: 0,
    totalAmount: 200,
    status: 'reserved',
    buyerConfirmedPayment: false,
    swishPaymentInitiated: false,
    swishPaymentInitiatedAt: null,
    receiptUploadedAt: null,
    createdAt: '2026-10-01T10:00:00',
    confirmedAt: null,
    show: evening,
    ...overrides,
  } as unknown as BookingResponse
}

const sara = booking({ firstName: 'Sara', lastName: 'Sundqvist', bookingReference: 'YAMWG', email: 'sara@sundqvi.st',
  adultTickets: 1, studentTickets: 3, totalAmount: 500, buyerConfirmedPayment: true, receiptUploadedAt: '2026-10-03T11:05:00' })
const anna = booking({ firstName: 'Anna', lastName: 'Rósa', bookingReference: 'KIBUK', adultTickets: 4, totalAmount: 800,
  buyerConfirmedPayment: true })
const lars = booking({ firstName: 'Lars', lastName: 'Tiberg', bookingReference: 'ANU2X', adultTickets: 3, totalAmount: 600 })
const suzan = booking({ firstName: 'Suzan', lastName: 'Karlsson', bookingReference: 'Q3VJ6', status: 'confirmed',
  buyerConfirmedPayment: true })

function renderList(bookings: BookingResponse[], handlers: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  const props = {
    onConfirm: vi.fn(),
    onResendConfirmation: vi.fn(),
    onResendTickets: vi.fn(),
    onDelete: vi.fn(),
    onShowReceipt: vi.fn(),
    ...handlers,
  }
  render(
    <MemoryRouter>
      <AdminBookingList bookings={bookings} confirmingIds={new Set()} {...props} />
    </MemoryRouter>
  )
  return props
}

const rowRefs = () =>
  screen.queryAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0].textContent)

describe('AdminBookingList', () => {
  it('puts bookings needing action first and marks receipts to review', () => {
    renderList([suzan, lars, anna, sara])

    expect(rowRefs()).toEqual(['YAMWG', 'KIBUK', 'ANU2X', 'Q3VJ6'])
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveClass('need')
    expect(rows[1]).not.toHaveClass('need')
  })

  it('shows one primary action per status and keeps the rest in the ⋯ menu', () => {
    const handlers = renderList([sara, anna, lars, suzan])

    fireEvent.click(screen.getByRole('button', { name: 'Granska kvitto' }))
    expect(handlers.onShowReceipt).toHaveBeenCalledWith(sara)

    const confirmButtons = screen.getAllByRole('button', { name: 'Bekräfta betalning' })
    expect(confirmButtons).toHaveLength(2) // waiting (Anna) and reserved (Lars)
    fireEvent.click(confirmButtons[0])
    expect(handlers.onConfirm).toHaveBeenCalledWith(anna.id)

    fireEvent.click(screen.getByRole('button', { name: 'Skicka om biljetter' }))
    expect(handlers.onResendTickets).toHaveBeenCalledWith(suzan.id)

    expect(screen.queryByRole('button', { name: /Radera/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Fler åtgärder för KIBUK' }))
    const menu = screen.getByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: /Redigera/ })).toHaveAttribute('href', `/admin/bookings/${anna.id}/edit`)
    fireEvent.click(within(menu).getByRole('menuitem', { name: /Skicka om bekräftelse/ }))
    expect(handlers.onResendConfirmation).toHaveBeenCalledWith(anna.id)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Fler åtgärder för KIBUK' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Radera/ }))
    expect(handlers.onDelete).toHaveBeenCalledWith(anna.id)
  })

  it('closes the ⋯ menu on Escape', () => {
    renderList([anna])
    fireEvent.click(screen.getByRole('button', { name: 'Fler åtgärder för KIBUK' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('filters by status with counts, and searches name, reference and email', () => {
    renderList([sara, anna, lars, suzan])

    expect(screen.getByRole('button', { name: /Att granska 1/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Alla 4/ })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: /Reserverade 1/ }))
    expect(rowRefs()).toEqual(['ANU2X'])

    fireEvent.click(screen.getByRole('button', { name: /Alla 4/ }))
    fireEvent.change(screen.getByLabelText('Sök bokningar'), { target: { value: 'sundqvi.st' } })
    expect(rowRefs()).toEqual(['YAMWG'])
    fireEvent.change(screen.getByLabelText('Sök bokningar'), { target: { value: 'q3vj' } })
    expect(rowRefs()).toEqual(['Q3VJ6'])
  })

  it('groups by show date and time, with a summary and a receipt badge', () => {
    const otherDay = booking({ bookingReference: 'NEXT1', show: { id: 2, date: '2026-11-18', startTime: '19:00', endTime: '20:00' } })
    renderList([sara, anna, otherDay])

    const heads = screen.getAllByRole('button', { expanded: true }).filter((b) => b.classList.contains('abl-show-head'))
    expect(heads).toHaveLength(2)
    expect(heads[0]).toHaveTextContent('19:00–20:00')
    expect(heads[0]).toHaveTextContent('2 bokningar')
    expect(heads[0]).toHaveTextContent('1 300 kr')
    expect(heads[0]).toHaveTextContent('1 kvitto att granska')
    expect(heads[1]).not.toHaveTextContent('att granska')

    fireEvent.click(heads[0])
    expect(screen.getByText('Ihopfälld – visa 2 bokningar')).toBeInTheDocument()
    expect(rowRefs()).toEqual(['NEXT1'])
  })

  it('reveals tappable contact details when the name is tapped', () => {
    renderList([anna])
    // On desktop the contact line is always shown under the name
    expect(screen.getByText(`${anna.email} · ${anna.phone}`)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /📞/, hidden: true })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Anna Rósa/ }))

    // The tap-to-expand details are the phone layout; the test window has desktop width,
    // where the stylesheet hides them, hence hidden: true
    expect(screen.getByRole('link', { name: anna.email, hidden: true })).toHaveAttribute('href', `mailto:${anna.email}`)
    expect(screen.getByRole('link', { name: /📞/, hidden: true })).toHaveAttribute('href', `tel:${anna.phone}`)
  })
})
