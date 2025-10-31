import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import ShipmentDetailsPage from '../ShipmentDetailsPage'
import { AuthProvider } from '@/contexts/AuthContext'
import { VirtualAddressProvider } from '@/hooks/useVirtualAddress'
import * as supabaseModule from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
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

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn()
  }
}))

const renderWithProviders = (component: React.ReactElement, route = '/dashboard/shipments/1') => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <VirtualAddressProvider>
          {component}
        </VirtualAddressProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('ShipmentDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state initially', () => {
    vi.mocked(supabaseModule.supabase.functions.invoke).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    renderWithProviders(<ShipmentDetailsPage />)
    
    // Check for loading skeleton/animation
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
  })

  it('displays error when shipment not found', async () => {
    vi.mocked(supabaseModule.supabase.functions.invoke).mockResolvedValue({
      error: { message: 'Shipment not found' }
    })

    renderWithProviders(<ShipmentDetailsPage />)

    await waitFor(() => {
      expect(screen.getByText(/shipment not found/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('displays shipment details when loaded', async () => {
    const mockShipmentData = {
      data: {
        shipment: {
          id: 1,
          tracking_number: 'QCS123456',
          customer_id: 'user-123',
          destination_id: 1,
          service_type: 'standard',
          status: 'in_transit',
          total_weight: 25,
          total_declared_value: 100,
          created_at: '2025-01-01T00:00:00Z',
          destinations: {
            city_name: 'Georgetown',
            country_name: 'Guyana'
          },
          items: [
            {
              id: 1,
              description: 'Test Item',
              weight: 25,
              quantity: 1,
              category: 'electronics'
            }
          ],
          tracking: [
            {
              id: 1,
              status: 'In Transit',
              location: 'Newark Airport',
              timestamp: '2025-01-02T00:00:00Z',
              notes: 'Package shipped'
            }
          ]
        }
      }
    }

    vi.mocked(supabaseModule.supabase.functions.invoke).mockResolvedValue(mockShipmentData)

    renderWithProviders(<ShipmentDetailsPage />)

    await waitFor(() => {
      expect(screen.getByText(/QCS123456/i)).toBeInTheDocument()
      expect(screen.getByText(/Georgetown/i)).toBeInTheDocument()
      expect(screen.getByText(/Test Item/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('displays tracking timeline when available', async () => {
    const mockShipmentData = {
      data: {
        shipment: {
          id: 1,
          tracking_number: 'QCS123456',
          customer_id: 'user-123',
          destination_id: 1,
          service_type: 'standard',
          status: 'in_transit',
          total_weight: 25,
          created_at: '2025-01-01T00:00:00Z',
          tracking: [
            {
              id: 1,
              status: 'Shipped',
              location: 'Newark Airport',
              timestamp: '2025-01-02T00:00:00Z',
              notes: 'Package shipped'
            }
          ]
        }
      }
    }

    vi.mocked(supabaseModule.supabase.functions.invoke).mockResolvedValue(mockShipmentData)

    renderWithProviders(<ShipmentDetailsPage />)

    await waitFor(() => {
      expect(screen.getByText(/Tracking Timeline/i)).toBeInTheDocument()
      expect(screen.getByText(/Newark Airport/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('displays empty state for documents when none exist', async () => {
    const mockShipmentData = {
      data: {
        shipment: {
          id: 1,
          tracking_number: 'QCS123456',
          customer_id: 'user-123',
          destination_id: 1,
          service_type: 'standard',
          status: 'in_transit',
          total_weight: 25,
          created_at: '2025-01-01T00:00:00Z',
          documents: []
        }
      }
    }

    vi.mocked(supabaseModule.supabase.functions.invoke).mockResolvedValue(mockShipmentData)

    renderWithProviders(<ShipmentDetailsPage />)

    await waitFor(() => {
      expect(screen.getByText(/No documents uploaded yet/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('displays documents when available', async () => {
    const mockShipmentData = {
      data: {
        shipment: {
          id: 1,
          tracking_number: 'QCS123456',
          customer_id: 'user-123',
          destination_id: 1,
          service_type: 'standard',
          status: 'in_transit',
          total_weight: 25,
          created_at: '2025-01-01T00:00:00Z',
          documents: [
            {
              id: 1,
              document_name: 'Invoice.pdf',
              document_type: 'invoice',
              file_url: 'https://example.com/invoice.pdf',
              upload_date: '2025-01-01T00:00:00Z',
              status: 'uploaded'
            }
          ]
        }
      }
    }

    vi.mocked(supabaseModule.supabase.functions.invoke).mockResolvedValue(mockShipmentData)

    renderWithProviders(<ShipmentDetailsPage />)

    await waitFor(() => {
      expect(screen.getByText(/Invoice.pdf/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

