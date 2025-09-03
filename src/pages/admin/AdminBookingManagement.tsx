import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
  MoreHorizontal
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

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
}

interface BookingFilters {
  status?: string[]
  dateRange?: { start: string; end: string }
  serviceType?: string
  priorityLevel?: string
  searchTerm?: string
}

const AdminBookingManagement: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<BookingFilters>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalBookings, setTotalBookings] = useState(0)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadBookings()
  }, [filters, currentPage])

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
        throw new Error(error.message)
      }

      setBookings(data?.data?.bookings || [])
      setTotalPages(data?.data?.pagination?.totalPages || 1)
      setTotalBookings(data?.data?.pagination?.total || 0)
    } catch (err) {
      console.error('Error loading bookings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load bookings')
      toast.error('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (searchTerm: string) => {
    setFilters({ ...filters, searchTerm })
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

    try {
      const bookingIds = Array.from(selectedBookings)
      
      const { error } = await supabase.functions.invoke('admin-update-booking', {
        body: {
          action: 'bulk_update',
          bulk_booking_ids: bookingIds,
          updates: { status: action === 'confirm' ? 'confirmed' : action === 'cancel' ? 'cancelled' : action }
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      toast.success(`Successfully ${action}ed ${selectedBookings.size} bookings`)
      setSelectedBookings(new Set())
      loadBookings()
    } catch (err) {
      console.error('Error with bulk action:', err)
      toast.error(`Failed to ${action} bookings`)
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
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800',
      express: 'bg-orange-100 text-orange-800',
      standard: 'bg-blue-100 text-blue-800'
    }
    return colors[priority] || 'bg-gray-100 text-gray-800'
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
            <h1 className="text-2xl font-bold text-gray-900">Booking Management</h1>
            <p className="text-gray-600 mt-1">
              {totalBookings} total bookings • {selectedBookings.size} selected
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              to="/admin/bookings/calendar"
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Calendar className="h-4 w-4 mr-2 inline" />
              Calendar View
            </Link>
            <button
              onClick={loadBookings}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search bookings..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) => handleSearch(e.target.value)}
              />
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
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Filter className="h-4 w-4 mr-2 inline" />
            Filters
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.serviceType || ''}
                  onChange={(e) => setFilters({ ...filters, serviceType: e.target.value || undefined })}
                >
                  <option value="">All Service Types</option>
                  <option value="standard">Standard</option>
                  <option value="express">Express</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority Level</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
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
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="relative w-12 px-6 sm:w-16 sm:px-8">
                  <button
                    onClick={handleSelectAll}
                    className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  >
                    {selectedBookings.size === bookings.length && bookings.length > 0 ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booking Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Window
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="relative w-12 px-6 sm:w-16 sm:px-8">
                    <button
                      onClick={() => handleSelectBooking(booking.id)}
                      className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    >
                      {selectedBookings.has(booking.id) ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-medium">
                      #{booking.id.slice(-8)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {booking.address.street}, {booking.address.city}
                    </div>
                    <div className="text-sm text-gray-500">
                      {booking.estimated_weight} lbs • {booking.service_type}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{booking.customer_email}</div>
                    <div className="text-sm text-gray-500">Customer ID: {booking.customer_id.slice(-8)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDateTime(booking.window_start)}
                    </div>
                    <div className="text-sm text-gray-500">
                      to {formatDateTime(booking.window_end)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {booking.hours_until_booking > 0
                        ? `In ${booking.hours_until_booking} hours`
                        : booking.hours_until_booking < 0
                        ? `${Math.abs(booking.hours_until_booking)} hours ago`
                        : 'Now'
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(booking.priority_level)}`}>
                      {booking.priority_level}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      Score: {booking.priority_score}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
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
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
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
    </div>
  )
}

export default AdminBookingManagement