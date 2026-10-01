import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import BookingPage from './BookingPage'
import i18n from '../i18n/config'

const show = {
  id: 1,
  date: '2026-10-10',
  startTime: '18:00',
  endTime: '19:00',
  totalTickets: 100,
  availableTickets: 50,
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

async function goToFinalStep() {
  const { container } = render(
    <MemoryRouter>
      <BookingPage />
    </MemoryRouter>
  )

  fireEvent.click(await screen.findByLabelText(/18:00-19:00/))
  fireEvent.click(screen.getByRole('button', { name: 'Nästa' }))

  fireEvent.click(container.querySelector('.btn-counter.plus') as HTMLButtonElement)
  fireEvent.click(screen.getByRole('button', { name: 'Till Varukorg' }))

  fireEvent.change(screen.getByLabelText(/Förnamn/), { target: { value: 'John' } })
  fireEvent.change(screen.getByLabelText(/Efternamn/), { target: { value: 'Doe' } })
  fireEvent.change(screen.getByLabelText(/E-post/), { target: { value: 'john@example.com' } })
  fireEvent.change(screen.getByLabelText(/Telefon/), { target: { value: '0701234567' } })

  return screen.getByRole('button', { name: 'Till Betalning' })
}

describe('BookingPage booking submission', () => {
  beforeEach(async () => {
    // jsdom reports an English browser language; the assertions use the Swedish labels
    await i18n.changeLanguage('sv')
    mockGet.mockReset()
    mockPost.mockReset()
    mockNavigate.mockReset()
    mockGet.mockImplementation((url: string) => {
      if (url === '/public/initialization-status') return Promise.resolve({ data: { isInitialized: true } })
      if (url === '/public/shows') return Promise.resolve({ data: [show] })
      return Promise.resolve({ data: {} })
    })
  })

  it('creates only one booking when the submit button is clicked repeatedly', async () => {
    const request = deferred<{ data: { bookingReference: string; email: string } }>()
    mockPost.mockReturnValue(request.promise)

    const submit = await goToFinalStep()
    fireEvent.click(submit)
    fireEvent.click(submit)
    fireEvent.click(submit)

    expect(mockPost).toHaveBeenCalledTimes(1)
    const busy = screen.getByRole('button', { name: 'Skickar…' })
    expect(busy).toBeDisabled()
    expect(busy).toHaveAttribute('aria-busy', 'true')

    request.resolve({ data: { bookingReference: 'ABC123', email: 'john@example.com' } })
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/booking/success/ABC123/john@example.com')
    )
    expect(mockPost).toHaveBeenCalledTimes(1)
  })

  it('re-enables the submit button when the booking fails so the user can retry', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    mockPost.mockRejectedValueOnce(new Error('network'))

    const submit = await goToFinalStep()
    fireEvent.click(submit)

    const retry = await screen.findByRole('button', { name: 'Till Betalning' })
    expect(retry).toBeEnabled()
    expect(alertSpy).toHaveBeenCalled()

    mockPost.mockResolvedValueOnce({ data: { bookingReference: 'ABC123', email: 'john@example.com' } })
    fireEvent.click(retry)
    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(2))

    alertSpy.mockRestore()
  })
})
