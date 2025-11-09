import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Layout from './Layout'

// Mock the BackendStatusContext
const mockUseBackendStatus = vi.fn()
vi.mock('../contexts/BackendStatusContext', () => ({
  useBackendStatus: () => mockUseBackendStatus(),
}))

// Mock the API
const mockApiGet = vi.fn()
vi.mock('../services/api', () => ({
  default: {
    get: (...args: any[]) => mockApiGet(...args),
  },
}))

describe('Layout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock: backend is online and not checking
    mockUseBackendStatus.mockReturnValue({
      isOnline: true,
      isChecking: false,
      lastChecked: new Date(),
    })
    // Default mock response
    mockApiGet.mockResolvedValue({
      data: {
        concertName: 'Default Concert',
        contactEmail: 'contact@example.com',
        contactPhone: '+46701234567',
      },
    })
  })

  it('should render children when backend is online', () => {
    mockUseBackendStatus.mockReturnValue({
      isOnline: true,
      isChecking: false,
      lastChecked: new Date(),
    })

    const { getByText } = render(
      <BrowserRouter>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </BrowserRouter>
    )

    expect(getByText('Test Content')).toBeInTheDocument()
  })

  it('should fetch and display settings when backend is online', async () => {
    mockUseBackendStatus.mockReturnValue({
      isOnline: true,
      isChecking: false,
      lastChecked: new Date(),
    })

    const mockSettings = {
      concertName: 'Test Concert',
      contactEmail: 'test@example.com',
      contactPhone: '+46701234567',
    }

    mockApiGet.mockResolvedValue({ data: mockSettings })

    render(
      <BrowserRouter>
        <Layout>
          <div>Content</div>
        </Layout>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/public/settings')
    })
  })

  it('should display header with concert name when backend is online', async () => {
    mockUseBackendStatus.mockReturnValue({
      isOnline: true,
      isChecking: false,
      lastChecked: new Date(),
    })

    const mockSettings = {
      concertName: 'Amazing Concert',
    }

    mockApiGet.mockResolvedValue({ data: mockSettings })

    render(
      <BrowserRouter>
        <Layout>
          <div>Content</div>
        </Layout>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Amazing Concert/i)).toBeInTheDocument()
    })
  })

  it('should show loading state when checking backend', () => {
    mockUseBackendStatus.mockReturnValue({
      isOnline: false,
      isChecking: true,
      lastChecked: null,
    })

    render(
      <BrowserRouter>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </BrowserRouter>
    )

    expect(screen.getByText(/Kontrollerar anslutning till servern/i)).toBeInTheDocument()
    expect(screen.queryByText('Test Content')).not.toBeInTheDocument()
  })

  it('should show offline message when backend is offline', () => {
    mockUseBackendStatus.mockReturnValue({
      isOnline: false,
      isChecking: false,
      lastChecked: new Date(),
    })

    render(
      <BrowserRouter>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </BrowserRouter>
    )

    expect(screen.getByText(/Backend är inte tillgänglig/i)).toBeInTheDocument()
    expect(screen.getByText(/Systemet är inte tillgängligt/i)).toBeInTheDocument()
    expect(screen.queryByText('Test Content')).not.toBeInTheDocument()
  })
})

