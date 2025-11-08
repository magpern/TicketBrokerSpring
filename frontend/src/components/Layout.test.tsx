import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Layout from './Layout'

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
    // Default mock response
    mockApiGet.mockResolvedValue({
      data: {
        concertName: 'Default Concert',
        contactEmail: 'contact@example.com',
        contactPhone: '+46701234567',
      },
    })
  })

  it('should render children', () => {
    const { getByText } = render(
      <BrowserRouter>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </BrowserRouter>
    )

    expect(getByText('Test Content')).toBeInTheDocument()
  })

  it('should fetch and display settings', async () => {
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

  it('should display header with concert name', async () => {
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
})

