import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import TrackingPage from '../TrackingPage'
import { AuthProvider } from '@/contexts/AuthContext'
import { VirtualAddressProvider } from '@/hooks/useVirtualAddress'
import * as supabaseModule from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn()
    }
  }
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}))

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <VirtualAddressProvider>
          {component}
        </VirtualAddressProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('TrackingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders tracking form', () => {
    renderWithProviders(<TrackingPage />)
    
    expect(screen.getByPlaceholderText(/enter tracking number/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /track/i })).toBeInTheDocument()
  })

  it('shows error when tracking number is empty', async () => {
    renderWithProviders(<TrackingPage />)
    
    const trackButton = screen.getByRole('button', { name: /track/i })
    trackButton.click()

    await waitFor(() => {
      expect(screen.getByText(/please enter a tracking number/i)).toBeInTheDocument()
    })
  })

  it('handles shipment not found', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      })
    })

    vi.mocked(supabaseModule.supabase.from).mockImplementation(mockFrom as any)

    renderWithProviders(<TrackingPage />)
    
    const input = screen.getByPlaceholderText(/enter tracking number/i)
    const trackButton = screen.getByRole('button', { name: /track/i })
    
    input.value = 'QCS123456'
    trackButton.click()

    await waitFor(() => {
      expect(screen.getByText(/tracking number not found/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('displays tracking result when shipment found', async () => {
    const mockShipment = {
      id: 1,
      tracking_number: 'QCS123456',
      customer_id: 'user-123',
      destination_id: 1,
      status: 'in_transit',
      total_weight: 25,
      service_type: 'standard',
      created_at: '2025-01-01T00:00:00Z'
    }

    const mockTrackingData = [
      {
        id: 1,
        shipment_id: 1,
        status: 'In Transit',
        location: 'Newark Airport',
        timestamp: '2025-01-02T00:00:00Z',
        is_customer_visible: true
      }
    ]

    const mockFrom = vi.fn((table: string) => {
      if (table === 'shipments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockShipment, error: null })
            })
          })
        }
      }
      if (table === 'shipment_tracking') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: mockTrackingData, error: null })
                })
              })
            })
          })
        }
      }
      if (table === 'destinations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { city_name: 'Georgetown', country_name: 'Guyana' },
                error: null
              })
            })
          })
        }
      }
      return { select: vi.fn() }
    })

    vi.mocked(supabaseModule.supabase.from).mockImplementation(mockFrom as any)

    renderWithProviders(<TrackingPage />)
    
    const input = screen.getByPlaceholderText(/enter tracking number/i) as HTMLInputElement
    const trackButton = screen.getByRole('button', { name: /track/i })
    
    input.value = 'QCS123456'
    trackButton.click()

    await waitFor(() => {
      expect(screen.getByText(/QCS123456/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

