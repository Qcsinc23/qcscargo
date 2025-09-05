import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  MapPin,
  Calendar,
  Package,
  Truck,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface BookingFormData {
  window_start: string
  window_end: string
  address: {
    street: string
    city: string
    state: string
    zip_code: string
  }
  status: string
  service_type: string
  estimated_weight: number
  priority_level: string
  notes: string
  internal_notes: string
  assigned_vehicle_id: string | null
}

interface Vehicle {
  id: string
  name: string
  capacity_lbs: number
  base_location_zip: string
  active: boolean
}

const BookingEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [formData, setFormData] = useState<BookingFormData>({
    window_start: '',
    window_end: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip_code: ''
    },
    status: 'pending',
    service_type: 'standard',
    estimated_weight: 0,
    priority_level: 'standard',
    notes: '',
    internal_notes: '',
    assigned_vehicle_id: null
  })
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [originalData, setOriginalData] = useState<BookingFormData | null>(null)

  useEffect(() => {
    if (id) {
      loadBookingData()
    }
  }, [id])

  const loadBookingData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Use edge function to get booking details (bypasses RLS)
      const { data, error: functionError } = await supabase.functions.invoke('admin-get-booking-details', {
        body: { booking_id: id }
      })

      if (functionError) {
        throw new Error(functionError.message)
      }

      if (data?.error) {
        throw new Error(data.error.message)
      }

      // Extract booking data from the edge function response
      const bookingData = data.data.booking
      const vehiclesData = data.data.availableVehicles

      const formBookingData: BookingFormData = {
        window_start: bookingData.window_start ? new Date(bookingData.window_start).toISOString().slice(0, 16) : '',
        window_end: bookingData.window_end ? new Date(bookingData.window_end).toISOString().slice(0, 16) : '',
        address: bookingData.address || {
          street: '',
          city: '',
          state: '',
          zip_code: ''
        },
        status: bookingData.status || 'pending',
        service_type: bookingData.service_type || 'standard',
        estimated_weight: bookingData.estimated_weight || 0,
        priority_level: bookingData.priority_level || 'standard',
        notes: bookingData.notes || '',
        internal_notes: bookingData.internal_notes || '',
        assigned_vehicle_id: bookingData.assigned_vehicle_id || null
      }

      setFormData(formBookingData)
      setOriginalData(formBookingData)
      
      // Set available vehicles from edge function response
      if (vehiclesData && vehiclesData.length > 0) {
        setVehicles(vehiclesData)
      }
    } catch (err) {
      console.error('Error loading booking:', err)
      setError(err instanceof Error ? err.message : 'Failed to load booking')
    } finally {
      setLoading(false)
    }
  }

  const loadVehicles = async () => {
    // Vehicles are now loaded through the edge function in loadBookingData
    // This function is kept for compatibility but is no longer needed
  }

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1]
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const validateForm = (): string[] => {
    const errors: string[] = []

    if (!formData.window_start) {
      errors.push('Start time is required')
    }
    
    if (!formData.window_end) {
      errors.push('End time is required')
    }
    
    if (formData.window_start && formData.window_end && 
        new Date(formData.window_start) >= new Date(formData.window_end)) {
      errors.push('End time must be after start time')
    }

    if (!formData.address.street.trim()) {
      errors.push('Street address is required')
    }
    
    if (!formData.address.city.trim()) {
      errors.push('City is required')
    }
    
    if (!formData.address.state.trim()) {
      errors.push('State is required')
    }
    
    if (!formData.address.zip_code.trim()) {
      errors.push('ZIP code is required')
    }

    if (formData.estimated_weight <= 0) {
      errors.push('Estimated weight must be greater than 0')
    }

    // Check vehicle capacity if assigned
    if (formData.assigned_vehicle_id) {
      const assignedVehicle = vehicles.find(v => v.id === formData.assigned_vehicle_id)
      if (assignedVehicle && formData.estimated_weight > assignedVehicle.capacity_lbs) {
        errors.push(`Weight exceeds vehicle capacity (${assignedVehicle.capacity_lbs} lbs)`)
      }
    }

    return errors
  }

  const hasChanges = (): boolean => {
    if (!originalData) return false
    return JSON.stringify(formData) !== JSON.stringify(originalData)
  }

  const handleSave = async () => {
    const validationErrors = validateForm()
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0])
      return
    }

    try {
      setSaving(true)

      // Use admin-update-booking edge function instead of direct Supabase query
      const { data, error: functionError } = await supabase.functions.invoke('admin-update-booking', {
        body: {
          booking_id: id,
          action: 'update',
          updates: {
            window_start: new Date(formData.window_start).toISOString(),
            window_end: new Date(formData.window_end).toISOString(),
            address: formData.address,
            status: formData.status,
            service_type: formData.service_type,
            estimated_weight: formData.estimated_weight,
            priority_level: formData.priority_level,
            notes: formData.notes,
            internal_notes: formData.internal_notes,
            assigned_vehicle_id: formData.assigned_vehicle_id
          },
          reason: 'Updated from admin edit page'
        }
      })

      if (functionError) {
        throw new Error(functionError.message)
      }

      if (data?.error) {
        throw new Error(data.error.message)
      }

      if (!data?.data?.results || data.data.results.length === 0) {
        throw new Error('No booking was updated')
      }

      const result = data.data.results[0]
      if (!result.success) {
        throw new Error('Failed to update booking')
      }

      toast.success('Booking updated successfully')
      navigate(`/admin/bookings/${id}`)
    } catch (err) {
      console.error('Error saving booking:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to save booking')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Booking</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => navigate('/admin/bookings')}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Back to Bookings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <button
            onClick={() => navigate(`/admin/bookings/${id}`)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Edit Booking #{id?.slice(-8)}
            </h1>
            <p className="text-gray-600">Modify booking details and settings</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 inline animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2 inline" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          
          <button
            onClick={() => navigate(`/admin/bookings/${id}`)}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Service Details */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Service Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                <select
                  value={formData.service_type}
                  onChange={(e) => handleInputChange('service_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="standard">Standard</option>
                  <option value="express">Express</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority Level</label>
                <select
                  value={formData.priority_level}
                  onChange={(e) => handleInputChange('priority_level', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="standard">Standard</option>
                  <option value="express">Express</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Weight (lbs)</label>
                <input
                  type="number"
                  value={formData.estimated_weight}
                  onChange={(e) => handleInputChange('estimated_weight', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  step="0.1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        {/* Time Window */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Service Window
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                <input
                  type="datetime-local"
                  value={formData.window_start}
                  onChange={(e) => handleInputChange('window_start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                <input
                  type="datetime-local"
                  value={formData.window_end}
                  onChange={(e) => handleInputChange('window_end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Address Information */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Address Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => handleInputChange('address.street', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter street address"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => handleInputChange('address.city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter city"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => handleInputChange('address.state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="State"
                    maxLength={2}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                  <input
                    type="text"
                    value={formData.address.zip_code}
                    onChange={(e) => handleInputChange('address.zip_code', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ZIP Code"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Vehicle Assignment */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Truck className="h-5 w-5 mr-2" />
              Vehicle Assignment
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Vehicle</label>
              <select
                value={formData.assigned_vehicle_id || ''}
                onChange={(e) => handleInputChange('assigned_vehicle_id', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">No vehicle assigned</option>
                {vehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} (Capacity: {vehicle.capacity_lbs} lbs, Base: {vehicle.base_location_zip})
                  </option>
                ))}
              </select>
              {formData.assigned_vehicle_id && (
                <p className="mt-1 text-xs text-gray-500">
                  {(() => {
                    const vehicle = vehicles.find(v => v.id === formData.assigned_vehicle_id)
                    if (!vehicle) return ''
                    const remainingCapacity = vehicle.capacity_lbs - formData.estimated_weight
                    return remainingCapacity >= 0 
                      ? `Remaining capacity: ${remainingCapacity} lbs`
                      : `Exceeds capacity by ${Math.abs(remainingCapacity)} lbs`
                  })()
                  }
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Notes */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Customer-visible notes..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Internal Notes</label>
                <textarea
                  value={formData.internal_notes}
                  onChange={(e) => handleInputChange('internal_notes', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Internal admin notes (not visible to customer)..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookingEditPage