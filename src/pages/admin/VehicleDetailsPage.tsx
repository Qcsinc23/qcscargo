import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Edit,
  Truck,
  MapPin,
  Package,
  Users,
  Calendar,
  Settings,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Route,
  Gauge,
  Plus
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface VehicleDetails {
  id: string
  name: string
  capacity_lbs: number
  service_area: any
  active: boolean
  base_location_zip: string
  base_location_lat: number
  base_location_lng: number
  notes: string
  created_at: string
  updated_at: string
}

interface Booking {
  id: string
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
  customer_id: string
  notes: string
}

interface VehicleStats {
  total_bookings: number
  completed_bookings: number
  pending_bookings: number
  total_weight_hauled: number
  avg_utilization_rate: number
  efficiency_score: number
}

const VehicleDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [vehicle, setVehicle] = useState<VehicleDetails | null>(null)
  const [currentBookings, setCurrentBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState<VehicleStats | null>(null)
  const [availableBookings, setAvailableBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBookingAssignment, setShowBookingAssignment] = useState(false)
  const [assigningBooking, setAssigningBooking] = useState(false)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })

  useEffect(() => {
    if (id) {
      loadVehicleData()
    }
  }, [id, selectedDate])

  const loadVehicleData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Use edge function to get vehicle details with bookings (bypasses RLS)
      const { data, error: functionError } = await supabase.functions.invoke('admin-get-vehicle-details', {
        body: { vehicle_id: id, date: selectedDate }
      })

      if (functionError) {
        throw new Error(functionError.message)
      }

      if (data?.error) {
        throw new Error(data.error.message)
      }

      // Set all data from the edge function response
      const { vehicle: vehicleData, assignedBookings, availableBookings, stats: statsData } = data.data
      
      setVehicle(vehicleData)
      setCurrentBookings(assignedBookings || [])
      setAvailableBookings(availableBookings || [])
      setStats(statsData || null)

    } catch (err) {
      console.error('Error loading vehicle data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load vehicle details')
      toast.error('Failed to load vehicle details')
    } finally {
      setLoading(false)
    }
  }

  const handleBookingAssignment = async (bookingId: string) => {
    if (!vehicle) return

    try {
      setAssigningBooking(true)
      
      const { data, error } = await supabase.functions.invoke('admin-update-booking', {
        body: {
          booking_id: bookingId,
          action: 'assign_vehicle',
          updates: { vehicle_id: vehicle.id },
          reason: 'Vehicle assigned from vehicle details page'
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      toast.success('Booking assigned successfully')
      await loadVehicleData()  // Reload all data
    } catch (err) {
      console.error('Error assigning booking:', err)
      toast.error('Failed to assign booking')
    } finally {
      setAssigningBooking(false)
    }
  }

  const handleBookingUnassignment = async (bookingId: string) => {
    try {
      // Use the admin-update-booking edge function for unassignment
      const { data, error } = await supabase.functions.invoke('admin-update-booking', {
        body: {
          booking_id: bookingId,
          action: 'update',
          updates: { assigned_vehicle_id: null },
          reason: 'Vehicle unassigned from vehicle details page'
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      if (data?.error) {
        throw new Error(data.error.message)
      }

      toast.success('Booking unassigned successfully')
      await loadVehicleData()  // Reload all data
    } catch (err) {
      console.error('Error unassigning booking:', err)
      toast.error('Failed to unassign booking')
    }
  }

  const calculateEfficiencyScore = (bookingCount: number, totalWeight: number, capacity: number): number => {
    if (capacity === 0) return 0
    
    const utilizationScore = Math.min((totalWeight / capacity) * 60, 60)
    const bookingScore = Math.min(bookingCount * 10, 40)
    
    return Math.round(utilizationScore + bookingScore)
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

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFullDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
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

  if (error || !vehicle) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Vehicle</h2>
          <p className="text-red-700 mb-4">{error || 'Vehicle not found'}</p>
          <button
            onClick={() => navigate('/admin/vehicles')}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Back to Vehicles
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
            onClick={() => navigate('/admin/vehicles')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${
              vehicle.active ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <Truck className={`h-8 w-8 ${
                vehicle.active ? 'text-green-600' : 'text-gray-400'
              }`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{vehicle.name}</h1>
              <p className="text-gray-600">Vehicle capacity and assignment management</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          
          <Link
            to={`/admin/vehicles/${vehicle.id}/edit`}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Edit className="h-4 w-4 mr-2 inline" />
            Edit Vehicle
          </Link>
          
          <button
            onClick={() => setShowBookingAssignment(!showBookingAssignment)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2 inline" />
            Assign Bookings
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicle Information */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Vehicle Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                  <p className="text-lg font-semibold text-gray-900">{vehicle.capacity_lbs.toLocaleString()} lbs</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Location</label>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                    <p className="text-gray-900">{vehicle.base_location_zip}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    vehicle.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {vehicle.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              {vehicle.notes && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{vehicle.notes}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Current Bookings */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
                <span className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Assigned Bookings ({selectedDate})
                </span>
                <span className="text-sm text-gray-500">{currentBookings.length} bookings</span>
              </h2>
              
              {currentBookings.length > 0 ? (
                <div className="space-y-3">
                  {currentBookings.map((booking) => (
                    <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Link 
                              to={`/admin/bookings/${booking.id}`}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                              #{booking.id.slice(-8)}
                            </Link>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </span>
                          </div>
                          
                          <div className="flex items-center text-sm text-gray-600 space-x-4">
                            <span>{formatDateTime(booking.window_start)} - {formatDateTime(booking.window_end)}</span>
                            <span>{booking.estimated_weight} lbs</span>
                            <span>{booking.address.city}, {booking.address.zip_code}</span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleBookingUnassignment(booking.id)}
                          className="text-xs text-red-600 hover:text-red-800 font-medium"
                        >
                          Unassign
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No bookings assigned for {selectedDate}</p>
              )}
            </div>
          </div>
          
          {/* Available Bookings for Assignment */}
          {showBookingAssignment && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
                  <span>Available Bookings ({selectedDate})</span>
                  <button
                    onClick={() => setShowBookingAssignment(false)}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Hide
                  </button>
                </h2>
                
                {availableBookings.length > 0 ? (
                  <div className="space-y-3">
                    {availableBookings.map((booking) => {
                      const canAssign = parseFloat(booking.estimated_weight as any) <= vehicle.capacity_lbs
                      return (
                        <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className="text-sm font-medium text-gray-900">#{booking.id.slice(-8)}</span>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </span>
                              </div>
                              
                              <div className="flex items-center text-sm text-gray-600 space-x-4">
                                <span>{formatDateTime(booking.window_start)} - {formatDateTime(booking.window_end)}</span>
                                <span className={canAssign ? 'text-gray-600' : 'text-red-600 font-medium'}>
                                  {booking.estimated_weight} lbs
                                </span>
                                <span>{booking.address.city}, {booking.address.zip_code}</span>
                              </div>
                              
                              {!canAssign && (
                                <p className="text-xs text-red-600 mt-1">
                                  Exceeds vehicle capacity by {parseFloat(booking.estimated_weight as any) - vehicle.capacity_lbs} lbs
                                </p>
                              )}
                            </div>
                            
                            <button
                              onClick={() => handleBookingAssignment(booking.id)}
                              disabled={!canAssign || assigningBooking}
                              className={`text-xs font-medium px-3 py-1 rounded ${
                                canAssign
                                  ? 'text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100'
                                  : 'text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              {assigningBooking ? 'Assigning...' : 'Assign'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No available bookings for {selectedDate}</p>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Performance Stats */}
          {stats && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Daily Performance
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Bookings</label>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_bookings}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight Utilization</label>
                    <div className="flex items-center space-x-2">
                      <p className="text-lg font-semibold text-gray-900">{stats.avg_utilization_rate.toFixed(1)}%</p>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            stats.avg_utilization_rate < 50 ? 'bg-yellow-500' :
                            stats.avg_utilization_rate < 85 ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(stats.avg_utilization_rate, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.total_weight_hauled.toFixed(0)} / {vehicle.capacity_lbs} lbs
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Efficiency Score</label>
                    <div className="flex items-center">
                      <p className={`text-lg font-semibold mr-2 ${
                        stats.efficiency_score >= 80 ? 'text-green-600' :
                        stats.efficiency_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {stats.efficiency_score}/100
                      </p>
                      {stats.efficiency_score >= 80 ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Completed</span>
                      <span className="font-medium text-green-600">{stats.completed_bookings}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Pending</span>
                      <span className="font-medium text-yellow-600">{stats.pending_bookings}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <Link
                  to={`/admin/vehicles/${vehicle.id}/edit`}
                  className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Vehicle Details
                </Link>
                
                <button
                  onClick={() => setShowBookingAssignment(!showBookingAssignment)}
                  className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {showBookingAssignment ? 'Hide' : 'Show'} Available Bookings
                </button>
                
                <button
                  onClick={() => navigate('/admin/vehicles')}
                  className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to All Vehicles
                </button>
              </div>
            </div>
          </div>
          
          {/* Service Area */}
          {vehicle.service_area && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Route className="h-5 w-5 mr-2" />
                  Service Area
                </h3>
                
                <div className="text-sm text-gray-600">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(vehicle.service_area, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VehicleDetailsPage