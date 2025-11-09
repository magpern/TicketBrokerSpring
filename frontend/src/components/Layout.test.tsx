import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

// Mock react-i18next BEFORE importing Layout
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'layout.backendOffline': 'Backend är inte tillgänglig',
        'layout.backendOfflineMessage': 'Systemet kan inte ansluta till servern. Vänligen försök igen senare.',
        'layout.backendOfflineNote': 'Sidan uppdateras automatiskt när anslutningen återställs.',
        'layout.checkingConnection': 'Kontrollerar anslutning till servern...',
        'layout.systemUnavailable': 'Systemet är inte tillgängligt',
        'layout.systemUnavailableMessage': 'Vi kan för närvarande inte ansluta till servern. Vänligen försök igen om en stund.',
        'common.contact': 'Kontakt',
        'common.contactLoading': 'Kontaktinformation laddas...',
      }
      return translations[key] || key
    },
    i18n: {
      language: 'sv',
      changeLanguage: vi.fn(),
    },
  }),
}))

// Mock LanguageSwitcher to avoid i18n issues
vi.mock('./LanguageSwitcher', () => ({
  default: () => <div data-testid="language-switcher">Language Switcher</div>,
}))

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

