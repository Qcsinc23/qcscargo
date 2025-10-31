import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Filter,
  Search,
  Download,
  Edit,
  Trash2,
  Eye,
  Plus,
  RefreshCw,
  CheckSquare,
  Square,
  MoreHorizontal,
  Check,
  X,
  Truck
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

interface Booking {
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
  hours_until_booking: number
  priority_score: number
  customer_email: string
  created_at: string
  assigned_vehicle_id?: string | null
}

interface Vehicle {
  id: string
  name: string
  capacity_lbs: number
  base_location_zip: string
  active: boolean
}

interface BookingFilters {
  status?: string[]
  dateRange?: { start: string; end: string }
  serviceType?: string
  priorityLevel?: string
  searchTerm?: string
}

const AdminBookingManagement: React.FC = () => {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<BookingFilters>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalBookings, setTotalBookings] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set())
  const [showDropdown, setShowDropdown] = useState<string | null>(null)
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([])
  const [showVehicleModal, setShowVehicleModal] = useState<string | null>(null)

  useEffect(() => {
    loadBookings()
    loadAvailableVehicles()
  }, [filters, currentPage])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown && !(event.target as Element).closest('.dropdown-container')) {
        setShowDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDropdown])

  const loadBookings = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.functions.invoke('admin-list-bookings', {
        body: {
          page: currentPage,
          limit: 25,
          ...filters
        }
      })

      if (error) {
        logger.error('Supabase function error', error, {
          component: 'AdminBookingManagement',
          action: 'loadBookings'
        })
        throw new Error(error.message || 'Failed to load bookings')
      }

      logger.debug('Bookings data received', {
        component: 'AdminBookingManagement',
        action: 'loadBookings',
        count: data?.data?.bookings?.length || 0
      })
      setBookings(data?.data?.bookings || [])
      setTotalPages(data?.data?.pagination?.totalPages || 1)
      setTotalBookings(data?.data?.pagination?.total || 0)
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      logger.error('Error loading bookings', error, {
        component: 'AdminBookingManagement',
        action: 'loadBookings'
      })
      const errorMessage = error.message
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableVehicles = async () => {
    try {
      // Use edge function to get vehicles (bypasses RLS)
      const { data, error: functionError } = await supabase.functions.invoke('admin-vehicles', {
        body: { action: 'list', date: new Date().toISOString().split('T')[0] }
      })

      if (functionError) {
        throw new Error(functionError.message)
      }

      if (data?.error) {
        throw new Error(data.error.message)
      }

      const vehicles = data?.data?.vehicles || []
      logger.debug('Loaded vehicles via edge function', {
        component: 'AdminBookingManagement',
        action: 'loadVehicles',
        count: vehicles.length
      })
      setAvailableVehicles(vehicles)
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      logger.error('Error loading vehicles', error, {
        component: 'AdminBookingManagement',
        action: 'loadVehicles'
      })
    }
  }

  const handleSearch = (searchTerm: string) => {
    const trimmedTerm = searchTerm.trim()
    setFilters({ ...filters, searchTerm: trimmedTerm || undefined })
    setCurrentPage(1)
  }

  const handleStatusFilter = (status: string) => {
    const currentStatuses = filters.status || []
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status]
    
    setFilters({ ...filters, status: newStatuses.length > 0 ? newStatuses : undefined })
    setCurrentPage(1)
  }

  const handleSelectBooking = (bookingId: string) => {
    const newSelected = new Set(selectedBookings)
    if (newSelected.has(bookingId)) {
      newSelected.delete(bookingId)
    } else {
      newSelected.add(bookingId)
    }
    setSelectedBookings(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedBookings.size === bookings.length) {
      setSelectedBookings(new Set())
    } else {
      setSelectedBookings(new Set(bookings.map(b => b.id)))
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedBookings.size === 0) {
      toast.error('Please select bookings first')
      return
    }

    const actionName = action === 'confirm' ? 'confirmed' : action === 'cancel' ? 'cancelled' : action
    const actionVerb = action === 'confirm' ? 'Confirming' : 'Cancelling'
    const bookingCount = selectedBookings.size
    const bookingText = bookingCount > 1 ? 'bookings' : 'booking'
    
    toast.loading(`${actionVerb} ${bookingCount} ${bookingText}...`, { id: 'bulk-action' })

    try {
      const bookingIds = Array.from(selectedBookings)
      
      const { data, error } = await supabase.functions.invoke('admin-update-booking', {
        body: {
          action: 'bulk_update',
          bulk_booking_ids: bookingIds,
          updates: { status: actionName },
          reason: `Bulk action: ${action}`
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      toast.success(
        `Successfully ${action}ed ${bookingCount} ${bookingText}!`,
        { id: 'bulk-action', duration: 4000 }
      )
      setSelectedBookings(new Set())
      await loadBookings()
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      logger.error('Error with bulk action', error, {
        component: 'AdminBookingManagement',
        action: 'handleBulkAction'
      })
      toast.error(`Failed to ${action} ${bookingCount} ${bookingText}`, { id: 'bulk-action', duration: 4000 })
    }
  }

  const handleIndividualAction = async (bookingId: string, action: string) => {
    setActionLoading(prev => new Set([...prev, bookingId]))
    const actionName = action === 'confirm' ? 'confirmed' : action === 'cancel' ? 'cancelled' : action
    const actionVerb = action === 'confirm' ? 'Confirming' : 'Cancelling'
    
    toast.loading(`${actionVerb} booking...`, { id: `action-${bookingId}` })
    
    try {
      const { data, error } = await supabase.functions.invoke('admin-update-booking', {
        body: {
          booking_id: bookingId,
          action: 'change_status',
          updates: { status: actionName },
          reason: `Manual ${action} by admin`
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      toast.success(`Booking ${action}ed successfully!`, { id: `action-${bookingId}`, duration: 3000 })
      await loadBookings()
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      logger.error('Error with individual action', error, {
        component: 'AdminBookingManagement',
        action: 'handleAction'
      })
      toast.error(`Failed to ${action} booking`, { id: `action-${bookingId}`, duration: 3000 })
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(bookingId)
        return newSet
      })
    }
  }

  const handleViewBooking = (bookingId: string) => {
    // Navigate to booking details page
    navigate(`/admin/bookings/${bookingId}`)
  }

  const handleEditBooking = (bookingId: string) => {
    // Navigate to booking edit page
    navigate(`/admin/bookings/${bookingId}/edit`)
  }

  const handleAssignVehicle = async (bookingId: string) => {
    setShowVehicleModal(bookingId)
  }

  const handleVehicleSelection = async (bookingId: string, vehicleId: string) => {
    setActionLoading(prev => new Set([...prev, bookingId]))
    
    try {
      const { data, error } = await supabase.functions.invoke('admin-update-booking', {
        body: {
          booking_id: bookingId,
          action: 'assign_vehicle',
          updates: { vehicle_id: vehicleId },
          reason: 'Vehicle assigned from booking management'
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      toast.success('Vehicle assigned successfully')
      setShowVehicleModal(null)
      await loadBookings()
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      logger.error('Error assigning vehicle', error, {
        component: 'AdminBookingManagement',
        action: 'assignVehicle'
      })
      toast.error('Failed to assign vehicle')
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(bookingId)
        return newSet
      })
    }
  }

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-rose-100 text-rose-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800',
      express: 'bg-orange-100 text-orange-800',
      standard: 'bg-pink-100 text-pink-800'
    }
    return colors[priority] || 'bg-gray-100 text-gray-800'
  }

  const getAssignmentStatus = (assignedVehicleId?: string | null) => {
    return assignedVehicleId ? 'assigned' : 'unassigned'
  }

  const getAssignmentColor = (assignedVehicleId?: string | null) => {
    return assignedVehicleId 
      ? 'bg-pink-100 text-pink-800' 
      : 'bg-gray-100 text-gray-800'
  }

  if (loading && bookings.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-rose-900">Booking Management</h1>
            <p className="text-pink-600 mt-1">
              {totalBookings} total bookings • {selectedBookings.size} selected
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              to="/admin/bookings/calendar"
              className="px-4 py-2 text-pink-700 bg-white border border-pink-300 rounded-md hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-pink-700 focus:ring-offset-2"
            >
              <Calendar className="h-4 w-4 mr-2 inline" />
              Calendar View
            </Link>
            <button
              onClick={loadBookings}
              disabled={loading}
              className="px-4 py-2 text-pink-700 bg-white border border-pink-300 rounded-md hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-pink-700 focus:ring-offset-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 inline ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-pink-400" />
              <input
                type="text"
                placeholder="Search by booking ID, address, notes..."
                className="w-full pl-10 pr-4 py-2 border border-pink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-700 focus:border-pink-700"
                onChange={(e) => handleSearch(e.target.value)}
              />
              {loading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <RefreshCw className="h-4 w-4 text-pink-400 animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Status Filters */}
          <div className="flex flex-wrap gap-2">
            {['confirmed', 'pending', 'completed', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => handleStatusFilter(status)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  filters.status?.includes(status)
                    ? 'bg-pink-100 text-pink-800 border-pink-300'
                    : 'bg-white text-pink-700 border-pink-300 hover:bg-rose-50'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 text-pink-700 bg-white border border-pink-300 rounded-md hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-pink-700 focus:ring-offset-2"
          >
            <Filter className="h-4 w-4 mr-2 inline" />
            Filters
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-pink-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-pink-700 mb-1">Service Type</label>
                <select
                  className="w-full px-3 py-2 border border-pink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-700 focus:border-pink-700"
                  value={filters.serviceType || ''}
                  onChange={(e) => setFilters({ ...filters, serviceType: e.target.value || undefined })}
                >
                  <option value="">All Service Types</option>
                  <option value="standard">Standard</option>
                  <option value="express">Express</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-pink-700 mb-1">Priority Level</label>
                <select
                  className="w-full px-3 py-2 border border-pink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-700 focus:border-pink-700"
                  value={filters.priorityLevel || ''}
                  onChange={(e) => setFilters({ ...filters, priorityLevel: e.target.value || undefined })}
                >
                  <option value="">All Priorities</option>
                  <option value="standard">Standard</option>
                  <option value="express">Express</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedBookings.size > 0 && (
        <div className="bg-pink-100 border border-pink-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-pink-900">
              {selectedBookings.size} booking(s) selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkAction('confirm')}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => handleBulkAction('cancel')}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setSelectedBookings(new Set())}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Bookings Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-rose-50">
              <tr>
                <th scope="col" className="relative w-12 px-6 sm:w-16 sm:px-8">
                  <button
                    onClick={handleSelectAll}
                    className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-pink-300 text-pink-700 focus:ring-pink-700"
                  >
                    {selectedBookings.size === bookings.length && bookings.length > 0 ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-pink-500 uppercase tracking-wider">
                  Booking Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-pink-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-pink-500 uppercase tracking-wider">
                  Time Window
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-pink-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-pink-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-pink-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-rose-50">
                  <td className="relative w-12 px-6 sm:w-16 sm:px-8">
                    <button
                      onClick={() => handleSelectBooking(booking.id)}
                      className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-pink-300 text-pink-700 focus:ring-pink-700"
                    >
                      {selectedBookings.has(booking.id) ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-rose-900 font-medium">
                      #{booking.id.slice(-8)}
                    </div>
                    <div className="text-sm text-pink-500">
                      {booking.address.street}, {booking.address.city}
                    </div>
                    <div className="text-sm text-pink-500">
                      {booking.estimated_weight} lbs • {booking.service_type}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-rose-900">{booking.customer_email}</div>
                    <div className="text-sm text-pink-500">Customer ID: {booking.customer_id.slice(-8)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-rose-900">
                      {formatDateTime(booking.window_start)}
                    </div>
                    <div className="text-sm text-pink-500">
                      to {formatDateTime(booking.window_end)}
                    </div>
                    <div className="text-xs text-pink-400">
                      {booking.hours_until_booking > 0
                        ? `In ${booking.hours_until_booking} hours`
                        : booking.hours_until_booking < 0
                        ? `${Math.abs(booking.hours_until_booking)} hours ago`
                        : 'Now'
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAssignmentColor(booking.assigned_vehicle_id)}`}>
                        {getAssignmentStatus(booking.assigned_vehicle_id)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(booking.priority_level)}`}>
                      {booking.priority_level}
                    </span>
                    <div className="text-xs text-pink-500 mt-1">
                      Score: {booking.priority_score}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleViewBooking(booking.id)}
                        className="text-pink-700 hover:text-pink-800 p-1 rounded hover:bg-pink-50 transition-colors"
                        title="View booking details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleEditBooking(booking.id)}
                        className="text-pink-600 hover:text-rose-900 p-1 rounded hover:bg-rose-50 transition-colors"
                        title="Edit booking"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <div className="relative dropdown-container">
                        <button 
                          onClick={() => setShowDropdown(showDropdown === booking.id ? null : booking.id)}
                          className="text-pink-600 hover:text-rose-900 p-1 rounded hover:bg-rose-50 transition-colors"
                          title="More actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {showDropdown === booking.id && (
                          <div className="absolute right-0 z-10 w-48 mt-1 bg-white border border-pink-200 rounded-md shadow-lg">
                            <div className="py-1">
                              {booking.status !== 'confirmed' && (
                                <button
                                  onClick={() => {
                                    handleIndividualAction(booking.id, 'confirm')
                                    setShowDropdown(null)
                                  }}
                                  disabled={actionLoading.has(booking.id)}
                                  className="flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50"
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Confirm Booking
                                </button>
                              )}
                              {booking.status !== 'cancelled' && (
                                <button
                                  onClick={() => {
                                    handleIndividualAction(booking.id, 'cancel')
                                    setShowDropdown(null)
                                  }}
                                  disabled={actionLoading.has(booking.id)}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Cancel Booking
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  handleAssignVehicle(booking.id)
                                  setShowDropdown(null)
                                }}
                                disabled={actionLoading.has(booking.id)}
                                className="flex items-center w-full px-4 py-2 text-sm text-pink-700 hover:bg-pink-50 disabled:opacity-50"
                              >
                                <Truck className="h-4 w-4 mr-2" />
                                Assign Vehicle
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-pink-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-pink-300 text-sm font-medium rounded-md text-pink-700 bg-white hover:bg-rose-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-pink-300 text-sm font-medium rounded-md text-pink-700 bg-white hover:bg-rose-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-pink-700">
                  Showing{' '}
                  <span className="font-medium">{(currentPage - 1) * 25 + 1}</span>
                  {' '}to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * 25, totalBookings)}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium">{totalBookings}</span>
                  {' '}results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = Math.max(1, Math.min(totalPages - 4, Math.max(1, currentPage - 2))) + i
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === currentPage
                            ? 'z-10 bg-pink-100 border-pink-700 text-pink-700'
                            : 'bg-white border-pink-300 text-pink-500 hover:bg-rose-50'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Vehicle Assignment Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-rose-900 mb-4">Assign Vehicle</h3>
              <p className="text-sm text-pink-600 mb-4">
                Select a vehicle to assign to booking #{showVehicleModal.slice(-8)}
              </p>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableVehicles.map(vehicle => {
                  const currentBooking = bookings.find(b => b.id === showVehicleModal)
                  const canAssign = !currentBooking || parseFloat(currentBooking.estimated_weight as any) <= vehicle.capacity_lbs
                  
                  return (
                    <button
                      key={vehicle.id}
                      onClick={() => handleVehicleSelection(showVehicleModal, vehicle.id)}
                      disabled={!canAssign}
                      className={`w-full text-left p-3 border rounded-lg transition-colors ${
                        canAssign 
                          ? 'border-pink-200 hover:border-pink-400 hover:bg-pink-50' 
                          : 'border-red-200 bg-red-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-rose-900">{vehicle.name}</div>
                          <div className="text-sm text-pink-500">
                            Capacity: {vehicle.capacity_lbs.toLocaleString()} lbs • Base: {vehicle.base_location_zip}
                          </div>
                          {!canAssign && currentBooking && (
                            <div className="text-xs text-red-600 mt-1">
                              Exceeds capacity by {parseFloat(currentBooking.estimated_weight as any) - vehicle.capacity_lbs} lbs
                            </div>
                          )}
                        </div>
                        <div className={`px-2 py-1 text-xs rounded-full ${
                          vehicle.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {vehicle.active ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
              
              {availableVehicles.length === 0 && (
                <p className="text-center text-pink-500 py-8">No vehicles available</p>
              )}
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowVehicleModal(null)}
                  className="px-4 py-2 text-pink-700 bg-white border border-pink-300 rounded-md hover:bg-rose-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminBookingManagement