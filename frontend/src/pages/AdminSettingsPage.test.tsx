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

vi.mock('../components/Layout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

import AdminSettingsPage from './AdminSettingsPage'

const stored = {
  concertName: 'Tjusés Klasskonsert',
  concertVenue: 'Aulan',
  adultPrice: '200',
  studentPrice: '100',
  adultTicketLabel: 'Ordinarie',
  studentTicketLabel: 'Student',
  swishNumber: '0704910447',
  swishRecipientName: 'Jimmy Ahlstrand',
  contactEmail: 'oliver.ahlstrand@icloud.com',
  adminEmail: 'oliver.ahlstrand@icloud.com',
  maxTicketsPerBooking: '4',
}

describe('AdminSettingsPage payment notification opt-out', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
    mockPost.mockResolvedValue({ data: stored })
    // The page refuses to save without a logged-in admin
    sessionStorage.setItem('adminAuthToken', 'dGVzdDp0ZXN0')
  })

  it('shows the stored opt-out and saves the administrator turning notifications back on', async () => {
    mockGet.mockResolvedValue({ data: { ...stored, notifyAdminOnBuyerPayment: 'false' } })
    render(
      <MemoryRouter>
        <AdminSettingsPage />
      </MemoryRouter>
    )

    const checkbox = await screen.findByLabelText(/Skicka e-post till administratören när en köpare har betalat/)
    expect(checkbox).not.toBeChecked()

    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()
    fireEvent.submit(checkbox.closest('form')!)

    await waitFor(() => expect(mockPost).toHaveBeenCalled())
    const [url, body] = mockPost.mock.calls[0]
    expect(url).toBe('/settings')
    expect((body as FormData).get('notify_admin_on_buyer_payment')).toBe('true')
  })

  it('defaults to sending notifications when nothing has been saved yet', async () => {
    mockGet.mockResolvedValue({ data: stored })
    render(
      <MemoryRouter>
        <AdminSettingsPage />
      </MemoryRouter>
    )

    expect(await screen.findByLabelText(/Skicka e-post till administratören/)).toBeChecked()
  })
})
