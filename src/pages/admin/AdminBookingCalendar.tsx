import React, { useState, useEffect, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Package,
  MapPin,
  User,
  Truck,
  Plus,
  Filter,
  RefreshCw
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface CalendarBooking {
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
  customer_email: string
  assigned_vehicle_id?: string
}

interface TimeSlot {
  hour: number
  minute: number
  bookings: CalendarBooking[]
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  bookings: CalendarBooking[]
  timeSlots: TimeSlot[]
}

const AdminBookingCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState<CalendarBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null)
  const [draggedBooking, setDraggedBooking] = useState<CalendarBooking | null>(null)
  const [statusFilter, setStatusFilter] = useState<string[]>([])

  useEffect(() => {
    loadBookings()
  }, [currentDate, viewMode])

  const loadBookings = async () => {
    try {
      setLoading(true)
      
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      
      const { data, error } = await supabase.functions.invoke('admin-list-bookings', {
        body: {
          dateRange: {
            start: startOfMonth.toISOString(),
            end: endOfMonth.toISOString()
          },
          status: statusFilter.length > 0 ? statusFilter : undefined,
          limit: 1000 // Get all bookings for the month
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      setBookings(data?.data?.bookings || [])
    } catch (err) {
      console.error('Error loading bookings:', err)
      toast.error('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    const firstDayOfCalendar = new Date(firstDayOfMonth)
    firstDayOfCalendar.setDate(firstDayOfCalendar.getDate() - firstDayOfCalendar.getDay())
    
    const days: CalendarDay[] = []
    const currentCalendarDate = new Date(firstDayOfCalendar)
    
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      const dateKey = currentCalendarDate.toISOString().split('T')[0]
      const dayBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.window_start).toISOString().split('T')[0]
        return bookingDate === dateKey
      })
      
      // Group bookings by time slots
      const timeSlots: TimeSlot[] = []
      for (let hour = 6; hour <= 20; hour++) {
        const slotBookings = dayBookings.filter(booking => {
          const bookingHour = new Date(booking.window_start).getHours()
          return bookingHour === hour
        })
        
        if (slotBookings.length > 0 || (selectedDate && selectedDate.toDateString() === currentCalendarDate.toDateString())) {
          timeSlots.push({
            hour,
            minute: 0,
            bookings: slotBookings
          })
        }
      }
      
      days.push({
        date: new Date(currentCalendarDate),
        isCurrentMonth: currentCalendarDate.getMonth() === month,
        isToday: currentCalendarDate.toDateString() === new Date().toDateString(),
        bookings: dayBookings,
        timeSlots
      })
      
      currentCalendarDate.setDate(currentCalendarDate.getDate() + 1)
    }
    
    return days
  }, [currentDate, bookings, selectedDate])

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
  }

  const handleDragStart = (booking: CalendarBooking, e: React.DragEvent) => {
    setDraggedBooking(booking)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (targetDate: Date, targetHour: number, e: React.DragEvent) => {
    e.preventDefault()
    
    if (!draggedBooking) return
    
    try {
      const newStartTime = new Date(targetDate)
      newStartTime.setHours(targetHour, 0, 0, 0)
      
      const originalStart = new Date(draggedBooking.window_start)
      const originalEnd = new Date(draggedBooking.window_end)
      const duration = originalEnd.getTime() - originalStart.getTime()
      
      const newEndTime = new Date(newStartTime.getTime() + duration)
      
      const { error } = await supabase.functions.invoke('admin-update-booking', {
        body: {
          booking_id: draggedBooking.id,
          action: 'reschedule',
          updates: {
            window_start: newStartTime.toISOString(),
            window_end: newEndTime.toISOString()
          },
          reason: 'Rescheduled via calendar drag-and-drop'
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      toast.success('Booking rescheduled successfully')
      await loadBookings()
    } catch (err) {
      console.error('Error rescheduling booking:', err)
      toast.error('Failed to reschedule booking')
    } finally {
      setDraggedBooking(null)
    }
  }

  const getBookingColor = (booking: CalendarBooking) => {
    const colors: Record<string, string> = {
      confirmed: 'bg-green-500',
      pending: 'bg-yellow-500',
      completed: 'bg-blue-500',
      cancelled: 'bg-red-500'
    }
    return colors[booking.status] || 'bg-gray-500'
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Calendar</h1>
          <p className="text-gray-600 mt-1">Drag and drop to reschedule bookings</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            {['confirmed', 'pending', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => {
                  const newFilter = statusFilter.includes(status)
                    ? statusFilter.filter(s => s !== status)
                    : [...statusFilter, status]
                  setStatusFilter(newFilter)
                }}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  statusFilter.includes(status)
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-gray-300">
            {(['month', 'week', 'day'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-sm font-medium ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } ${mode === 'month' ? 'rounded-l-md' : mode === 'day' ? 'rounded-r-md' : ''}`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          
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

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePrevMonth}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <h2 className="text-xl font-semibold text-gray-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        
        <button
          onClick={handleNextMonth}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Month View */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-0 border-b border-gray-200">
            {weekDays.map((day) => (
              <div key={day} className="p-4 text-center font-semibold text-gray-700 bg-gray-50">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                onClick={() => handleDateSelect(day.date)}
                className={`min-h-[120px] p-2 border-r border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                  !day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
                } ${
                  day.isToday ? 'bg-blue-50' : ''
                } ${
                  selectedDate && selectedDate.toDateString() === day.date.toDateString() ? 'ring-2 ring-blue-500 ring-inset' : ''
                }`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(day.date, 9, e)} // Default to 9 AM
              >
                <div className={`text-sm font-medium mb-2 ${
                  day.isToday ? 'text-blue-600' : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {day.date.getDate()}
                </div>
                
                {/* Bookings */}
                <div className="space-y-1">
                  {day.bookings.slice(0, 3).map((booking) => (
                    <div
                      key={booking.id}
                      draggable
                      onDragStart={(e) => handleDragStart(booking, e)}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedBooking(booking)
                      }}
                      className={`px-2 py-1 text-xs text-white rounded cursor-move hover:opacity-80 ${
                        getBookingColor(booking)
                      }`}
                      title={`${booking.customer_email} - ${formatTime(booking.window_start)}`}
                    >
                      <div className="truncate">
                        {formatTime(booking.window_start)} {booking.customer_email.split('@')[0]}
                      </div>
                    </div>
                  ))}
                  {day.bookings.length > 3 && (
                    <div className="text-xs text-gray-500 px-2">
                      +{day.bookings.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day View */}
      {viewMode === 'day' && selectedDate && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </h3>
          </div>
          
          <div className="p-4">
            <div className="space-y-4">
              {Array.from({ length: 15 }, (_, i) => i + 6).map((hour) => {
                const hourBookings = calendarDays
                  .find(day => day.date.toDateString() === selectedDate.toDateString())
                  ?.bookings.filter(booking => new Date(booking.window_start).getHours() === hour) || []
                
                return (
                  <div
                    key={hour}
                    className="flex border border-gray-200 rounded-lg min-h-[80px]"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(selectedDate, hour, e)}
                  >
                    <div className="w-20 p-4 text-sm font-medium text-gray-500 border-r border-gray-200">
                      {hour}:00
                    </div>
                    <div className="flex-1 p-4">
                      {hourBookings.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {hourBookings.map((booking) => (
                            <div
                              key={booking.id}
                              draggable
                              onDragStart={(e) => handleDragStart(booking, e)}
                              onClick={() => setSelectedBooking(booking)}
                              className={`p-3 rounded-lg text-white cursor-move hover:opacity-80 ${getBookingColor(booking)}`}
                            >
                              <div className="font-medium text-sm">
                                {formatTime(booking.window_start)} - {formatTime(booking.window_end)}
                              </div>
                              <div className="text-sm opacity-90 mt-1">
                                {booking.customer_email.split('@')[0]}
                              </div>
                              <div className="text-xs opacity-75 mt-1">
                                {booking.estimated_weight} lbs • {booking.service_type}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          <div className="text-center">
                            <Clock className="h-8 w-8 mx-auto mb-2" />
                            <p className="text-sm">No bookings at {hour}:00</p>
                            <p className="text-xs mt-1">Drop a booking here to reschedule</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setSelectedBooking(null)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Booking Details #{selectedBooking.id.slice(-8)}
                  </h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedBooking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    selectedBooking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    selectedBooking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedBooking.status}
                  </span>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-900">{selectedBooking.customer_email}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-900">
                      {formatTime(selectedBooking.window_start)} - {formatTime(selectedBooking.window_end)}
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-900">
                      {selectedBooking.address.street}, {selectedBooking.address.city}, {selectedBooking.address.state}
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <Package className="h-4 w-4 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-900">
                      {selectedBooking.estimated_weight} lbs • {selectedBooking.service_type}
                    </span>
                  </div>
                  
                  {selectedBooking.notes && (
                    <div className="">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{selectedBooking.notes}</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Edit Booking
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500 bg-opacity-50">
          <div className="bg-white rounded-lg p-6 flex items-center">
            <RefreshCw className="h-6 w-6 text-blue-600 animate-spin mr-3" />
            <span className="text-gray-900">Loading calendar...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminBookingCalendar