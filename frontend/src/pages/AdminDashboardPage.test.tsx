import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'

const mockGet = vi.fn()
const mockPost = vi.fn()
vi.mock('../services/adminApi', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}))

// Layout pulls in backend status checks that are irrelevant here
vi.mock('../components/Layout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

import AdminDashboardPage from './AdminDashboardPage'

const reservedBooking = {
  id: 1,
  bookingReference: 'ABC123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+46701234567',
  adultTickets: 1,
  studentTickets: 0,
  totalAmount: 200,
  status: 'reserved',
  buyerConfirmedPayment: true,
  show: { id: 1, startTime: '19:00', endTime: '21:00' },
  createdAt: '2026-09-01T10:00:00',
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function renderDashboard() {
  render(
    <MemoryRouter>
      <AdminDashboardPage />
    </MemoryRouter>
  )
  return screen.findByRole('button', { name: 'Bekräfta betalning' })
}

describe('AdminDashboardPage payment confirmation', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
    mockGet.mockResolvedValue({ data: [reservedBooking] })
  })

  it('disables the button and sends a single request while confirmation is pending', async () => {
    const request = deferred<{ data: unknown }>()
    mockPost.mockReturnValue(request.promise)
    const button = await renderDashboard()

    fireEvent.click(button)
    fireEvent.click(button)

    const pending = screen.getByRole('button', { name: 'Bekräftar…' })
    expect(pending).toBeDisabled()
    expect(mockPost).toHaveBeenCalledTimes(1)
    expect(mockPost).toHaveBeenCalledWith('/bookings/1/confirm-payment')

    request.resolve({ data: { ...reservedBooking, status: 'confirmed' } })

    expect(await screen.findByText('Betalning bekräftad!')).toBeInTheDocument()
    // The "Bekräftade" filter chip also matches /Bekräfta/, so check the confirm button itself
    expect(screen.queryByRole('button', { name: 'Bekräfta betalning' })).not.toBeInTheDocument()
  })

  it('re-enables the button when the request fails', async () => {
    const request = deferred<{ data: unknown }>()
    mockPost.mockReturnValue(request.promise)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const button = await renderDashboard()

    fireEvent.click(button)
    expect(screen.getByRole('button', { name: 'Bekräftar…' })).toBeDisabled()

    request.reject(new Error('network'))

    expect(await screen.findByText('Kunde inte bekräfta betalning')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Bekräfta betalning' })).toBeEnabled()
    )
  })
})
