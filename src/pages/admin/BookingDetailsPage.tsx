import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Edit,
  Truck,
  MapPin,
  Calendar,
  Package,
  User,
  Phone,
  Mail,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  History
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface BookingDetails {
  id: string
  customer_id: string
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
  distance_miles: number
  created_at: string
  updated_at: string
  pickup_or_drop: string
  customer_email?: string
}

interface Vehicle {
  id: string
  name: string
  capacity_lbs: number
  base_location_zip: string
  active: boolean
}

interface Customer {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
}

const BookingDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assigningVehicle, setAssigningVehicle] = useState(false)
  const [showVehicleSelector, setShowVehicleSelector] = useState(false)

  useEffect(() => {
    if (id) {
      loadBookingDetails()
    }
  }, [id])

  const loadBookingDetails = async () => {
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

      // Set the data from the edge function response
      const { booking: bookingData, vehicle: vehicleData, customer: customerData, availableVehicles: vehiclesData } = data.data
      
      setBooking(bookingData)
      setVehicle(vehicleData)
      setCustomer(customerData)
      setAvailableVehicles(vehiclesData || [])

    } catch (err) {
      console.error('Error loading booking details:', err)
      setError(err instanceof Error ? err.message : 'Failed to load booking details')
      toast.error('Failed to load booking details')
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableVehicles = async () => {
    // This is now handled by the edge function in loadBookingDetails
    // No separate call needed
  }

  const handleVehicleAssignment = async (vehicleId: string) => {
    if (!booking) return

    try {
      setAssigningVehicle(true)
      
      const { data, error } = await supabase.functions.invoke('admin-update-booking', {
        body: {
          booking_id: booking.id,
          action: 'assign_vehicle',
          updates: { vehicle_id: vehicleId },
          reason: 'Vehicle assigned from booking details page'
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      toast.success('Vehicle assigned successfully')
      setShowVehicleSelector(false)
      await loadBookingDetails() // Refresh data
    } catch (err) {
      console.error('Error assigning vehicle:', err)
      toast.error('Failed to assign vehicle')
    } finally {
      setAssigningVehicle(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!booking) return

    try {
      const { data, error } = await supabase.functions.invoke('admin-update-booking', {
        body: {
          booking_id: booking.id,
          action: 'change_status',
          updates: { status: newStatus },
          reason: `Status changed to ${newStatus} from booking details page`
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      toast.success(`Booking ${newStatus} successfully`)
      await loadBookingDetails() // Refresh data
    } catch (err) {
      console.error('Error updating status:', err)
      toast.error('Failed to update booking status')
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800 border-red-200',
      express: 'bg-orange-100 text-orange-800 border-orange-200',
      standard: 'bg-blue-100 text-blue-800 border-blue-200'
    }
    return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Booking</h2>
          <p className="text-red-700 mb-4">{error || 'Booking not found'}</p>
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <button
            onClick={() => navigate('/admin/bookings')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Booking #{booking.id.slice(-8)}
            </h1>
            <p className="text-gray-600">View and manage booking details</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Link
            to={`/admin/bookings/${booking.id}/edit`}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Edit className="h-4 w-4 mr-2 inline" />
            Edit Booking
          </Link>
          
          {booking.status === 'pending' && (
            <>
              <button
                onClick={() => handleStatusChange('confirmed')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="h-4 w-4 mr-2 inline" />
                Confirm
              </button>
              <button
                onClick={() => handleStatusChange('cancelled')}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                <XCircle className="h-4 w-4 mr-2 inline" />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Booking Information */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Booking Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                  <p className="text-sm text-gray-900 capitalize">{booking.service_type}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup/Drop-off</label>
                  <p className="text-sm text-gray-900 capitalize">{booking.pickup_or_drop}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Weight</label>
                  <p className="text-sm text-gray-900">{booking.estimated_weight} lbs</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Distance</label>
                  <p className="text-sm text-gray-900">{booking.distance_miles} miles</p>
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-900">{booking.address.street}</p>
                    <p className="text-sm text-gray-900">
                      {booking.address.city}, {booking.address.state} {booking.address.zip_code}
                    </p>
                  </div>
                </div>
              </div>
              
              {booking.notes && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Notes</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{booking.notes}</p>
                </div>
              )}
              
              {booking.internal_notes && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                  <p className="text-sm text-gray-900 bg-yellow-50 p-3 rounded-md border border-yellow-200">{booking.internal_notes}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Time Window */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Service Window
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <p className="text-sm text-gray-900">{formatDateTime(booking.window_start)}</p>
                  </div>
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <p className="text-sm text-gray-900">{formatDateTime(booking.window_end)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Customer Information */}
          {customer && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Customer Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <p className="text-sm text-gray-900">{customer.first_name} {customer.last_name}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-gray-400 mr-2" />
                      <a href={`mailto:${customer.email}`} className="text-sm text-blue-600 hover:text-blue-800">
                        {customer.email}
                      </a>
                    </div>
                  </div>
                  
                  {customer.phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 text-gray-400 mr-2" />
                        <a href={`tel:${customer.phone}`} className="text-sm text-blue-600 hover:text-blue-800">
                          {customer.phone}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Priority */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status & Priority</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(booking.priority_level)}`}>
                    {booking.priority_level.charAt(0).toUpperCase() + booking.priority_level.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Assigned Vehicle */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
                <span className="flex items-center">
                  <Truck className="h-5 w-5 mr-2" />
                  Assigned Vehicle
                </span>
                <button
                  onClick={() => setShowVehicleSelector(!showVehicleSelector)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  {vehicle ? 'Change' : 'Assign'}
                </button>
              </h3>
              
              {vehicle ? (
                <div className="space-y-2">
                  <p className="font-medium text-gray-900">{vehicle.name}</p>
                  <p className="text-sm text-gray-600">Capacity: {vehicle.capacity_lbs} lbs</p>
                  <p className="text-sm text-gray-600">Base: {vehicle.base_location_zip}</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    vehicle.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {vehicle.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No vehicle assigned</p>
              )}
              
              {showVehicleSelector && (
                <div className="mt-4 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Select Vehicle</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {availableVehicles.map(v => (
                      <button
                        key={v.id}
                        onClick={() => handleVehicleAssignment(v.id)}
                        disabled={assigningVehicle}
                        className="w-full text-left p-2 text-sm border border-gray-200 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <div className="font-medium">{v.name}</div>
                        <div className="text-gray-500">{v.capacity_lbs} lbs • {v.base_location_zip}</div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowVehicleSelector(false)}
                    className="w-full mt-2 px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Timestamps */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <History className="h-5 w-5 mr-2" />
                Timestamps
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                  <p className="text-sm text-gray-900">{formatDateTime(booking.created_at)}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                  <p className="text-sm text-gray-900">{formatDateTime(booking.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookingDetailsPage