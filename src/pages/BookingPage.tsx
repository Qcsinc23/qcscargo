import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  Loader2, 
  Package, 
  Clock,
  MapPin,
  ArrowLeft,
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle,
  Truck
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface AvailableWindow {
  start: string
  end: string
  display: string
  remaining_capacity_lbs: number
  assigned_vehicle: {
    id: string
    name: string
    capacity_lbs: number
  }
  estimated_travel_time_minutes?: number
}

interface BookingFormData {
  pickup_or_drop: 'pickup' | 'dropoff'
  service_type: 'standard' | 'express'
  estimated_weight: number
  address: {
    street: string
    city: string
    state: string
    zip_code: string
    latitude?: number
    longitude?: number
  }
  notes: string
  selected_window?: AvailableWindow
}

const generateIdempotencyKey = () => {
  return `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Enhanced error handling functions
const getErrorMessage = (error: any) => {
  if (typeof error === 'string') return error
  if (error?.message) return error.message
  return 'An unexpected error occurred'
}

const handleBookingError = (error: any, formData: BookingFormData) => {
  const errorMessage = getErrorMessage(error).toLowerCase()
  
  // Double booking / conflict errors
  if (errorMessage.includes('conflict') || errorMessage.includes('already booked') || errorMessage.includes('double') || errorMessage.includes('concurrent')) {
    toast.error('Time Slot Unavailable', {
      description: 'This time slot is no longer available. Please select a different time window.',
      duration: 6000
    })
    return 'This time slot has been booked by another customer. Please choose a different time window.'
  }
  
  // Capacity overflow errors
  if (errorMessage.includes('capacity') || errorMessage.includes('weight') || errorMessage.includes('overload')) {
    toast.error('Capacity Exceeded', {
      description: `The estimated weight (${formData.estimated_weight} lbs) exceeds available vehicle capacity. Please reduce weight or choose another time.`,
      duration: 6000
    })
    return `Vehicle capacity exceeded. The estimated weight of ${formData.estimated_weight} lbs is too heavy for the remaining capacity in this time slot.`
  }
  
  // Distance/radius errors
  if (errorMessage.includes('radius') || errorMessage.includes('distance') || errorMessage.includes('service area')) {
    toast.error('Outside Service Area', {
      description: 'Your pickup location is outside our 25-mile service radius. Please choose drop-off or contact support.',
      duration: 6000
    })
    return 'Your location is outside our service area. Please choose drop-off service or contact support for special arrangements.'
  }
  
  // Authentication errors
  if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden') || errorMessage.includes('auth')) {
    toast.error('Authentication Required', {
      description: 'Please log in again to continue with your booking.',
      duration: 5000
    })
    return 'Your session has expired. Please log in again to continue.'
  }
  
  // Network/connectivity errors
  if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('fetch')) {
    toast.error('Connection Problem', {
      description: 'Unable to connect to our servers. Please check your internet connection and try again.',
      duration: 5000
    })
    return 'Network connection error. Please check your internet connection and try again.'
  }
  
  // Invalid time slot errors
  if (errorMessage.includes('invalid') || errorMessage.includes('expired') || errorMessage.includes('time')) {
    toast.error('Invalid Time Slot', {
      description: 'The selected time slot is no longer valid. Please refresh and select a new time.',
      duration: 5000
    })
    return 'The selected time slot is no longer valid. Please select a different time window.'
  }
  
  // Business hours / closed errors
  if (errorMessage.includes('closed') || errorMessage.includes('business hours') || errorMessage.includes('holiday')) {
    toast.error('Service Unavailable', {
      description: 'We are closed on the selected date. Please choose a different date.',
      duration: 5000
    })
    return 'Service is unavailable on the selected date. Please choose a different date.'
  }
  
  // Generic API errors
  if (error?.status === 500 || errorMessage.includes('server') || errorMessage.includes('internal')) {
    toast.error('Server Error', {
      description: 'Our servers are experiencing issues. Please try again in a few minutes.',
      duration: 5000
    })
    return 'Server error occurred. Please try again in a few minutes.'
  }
  
  // Default error handling
  toast.error('Booking Failed', {
    description: errorMessage || 'Please try again or contact support if the problem persists.',
    duration: 5000
  })
  return errorMessage || 'An unexpected error occurred. Please try again.'
}

export default function BookingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  // Extract URL parameters
  const destinationId = searchParams.get('destinationId')
  const serviceType = searchParams.get('serviceType') || 'standard'
  const weight = searchParams.get('weight')
  const quoteId = searchParams.get('quoteId')
  const shipmentId = searchParams.get('shipmentId')
  
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [availableWindows, setAvailableWindows] = useState<AvailableWindow[]>([])
  const [formData, setFormData] = useState<BookingFormData>({
    pickup_or_drop: 'pickup',
    service_type: (serviceType as 'standard' | 'express') || 'standard',
    estimated_weight: weight ? parseFloat(weight) : 0,
    address: {
      street: '',
      city: '',
      state: 'NJ',
      zip_code: ''
    },
    notes: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [windowsLoading, setWindowsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [createdBooking, setCreatedBooking] = useState<any>(null)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date())
  
  // Load user profile to prefill address
  useEffect(() => {
    if (user) {
      loadUserProfile()
    }
  }, [user])
  
  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('address_line1, city, state, zip_code')
        .eq('user_id', user?.id)
        .maybeSingle()
      
      if (data && !error) {
        setFormData(prev => ({
          ...prev,
          address: {
            street: data.address_line1 || '',
            city: data.city || '',
            state: data.state || 'NJ',
            zip_code: data.zip_code || ''
          }
        }))
      }
    } catch (err) {
      console.error('Error loading user profile:', err)
    }
  }
  
  // Load available windows when date changes
  useEffect(() => {
    if (selectedDate && formData.estimated_weight > 0) {
      loadAvailableWindows()
    }
  }, [selectedDate, formData.pickup_or_drop, formData.estimated_weight, formData.service_type, formData.address.zip_code])
  
  // Real-time subscription for booking updates
  useEffect(() => {
    if (!selectedDate) return
    
    console.log('Setting up real-time subscription for bookings...')
    
    // Subscribe to bookings table changes
    const subscription = supabase
      .channel('booking-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          console.log('Real-time booking update received:', payload)
          
          // Only refresh if the booking affects the currently selected date
          const bookingData = payload.new || payload.old
          if (!bookingData) return
          
          // Type-safe access to window_start
          const windowStart = (bookingData as any)?.window_start
          if (!windowStart) return
          
          const bookingDate = new Date(windowStart)
          const currentDate = selectedDate
          
          if (bookingDate.toDateString() === currentDate.toDateString()) {
            console.log('Booking update affects current date, refreshing available windows...')
            
            // Show toast notification about real-time update
            if (payload.eventType === 'INSERT') {
              toast.info('Availability Updated', {
                description: 'Time slots have been updated due to a new booking.',
                duration: 4000
              })
            }
            
            // Refresh available windows after a short delay
            setTimeout(() => {
              loadAvailableWindows()
            }, 1000)
          }
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to booking updates')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error('Error with booking subscription:', status)
        }
      })
    
    // Cleanup subscription when component unmounts or date changes
    return () => {
      console.log('Cleaning up real-time subscription...')
      supabase.removeChannel(subscription)
    }
  }, [selectedDate]) // Re-subscribe when selected date changes
  
  // Periodic refresh as backup for real-time updates
  useEffect(() => {
    if (!selectedDate || availableWindows.length === 0) return
    
    console.log('Setting up periodic refresh for availability updates...')
    
    const refreshInterval = setInterval(() => {
      const timeSinceLastRefresh = Date.now() - lastRefreshTime.getTime()
      
      // Only refresh if it's been more than 30 seconds since last refresh
      if (timeSinceLastRefresh > 30000) {
        console.log('Performing periodic refresh of available windows...')
        loadAvailableWindows()
        setLastRefreshTime(new Date())
      }
    }, 60000) // Check every minute
    
    return () => {
      clearInterval(refreshInterval)
    }
  }, [selectedDate, availableWindows.length, lastRefreshTime])
  
  const loadAvailableWindows = async () => {
    if (!selectedDate) return
    
    setWindowsLoading(true)
    setError('')
    
    try {
      const requestBody = {
        date: selectedDate.toISOString().split('T')[0],
        estimated_weight_lbs: formData.estimated_weight,
        pickup_or_drop: formData.pickup_or_drop,
        service_type: formData.service_type,
        zip_code: formData.address.zip_code || null
      }
      
      console.log('Loading available windows with params:', requestBody)
      
      const { data, error } = await supabase.functions.invoke('get-available-windows', {
        body: requestBody
      })
      
      if (error) {
        console.error('Edge function error:', error)
        throw new Error(error.message || 'Failed to load available windows')
      }
      
      if (data?.error) {
        console.error('API error response:', data.error)
        throw new Error(data.error.message || data.error.code || 'Failed to load available time slots')
      }
      
      const result = data?.data
      if (result) {
        setAvailableWindows(result.available_windows || [])
        
        // Handle different response scenarios
        if (result.available_windows?.length === 0) {
          if (result.reason && result.message) {
            // Specific reason provided (e.g., out of service area, closed day)
            setError(result.message)
            if (result.reason === 'Out of Service Area') {
              toast.warning('Outside Service Area', {
                description: result.message,
                duration: 8000
              })
            } else if (result.reason === 'Closed') {
              toast.info('Service Unavailable', {
                description: result.message,
                duration: 5000
              })
            }
          } else {
            // Generic no availability
            const noAvailabilityMsg = `No time slots available for ${format(selectedDate, 'EEEE, MMMM d')}. Try a different date or reduce the estimated weight.`
            setError(noAvailabilityMsg)
            toast.info('No Available Slots', {
              description: 'Try selecting a different date or adjusting your requirements.',
              duration: 5000
            })
          }
        } else {
          // Clear any previous errors when slots are found
          setError('')
          
          // Show distance information if available
          if (result.request_details?.distance_miles) {
            toast.success('Time Slots Loaded', {
              description: `Found ${result.available_windows.length} available slots. Distance: ${result.request_details.distance_miles.toFixed(1)} miles`,
              duration: 4000
            })
          }
          
          // Update last refresh time
          setLastRefreshTime(new Date())
        }
      } else {
        throw new Error('Invalid response format')
      }
      
    } catch (err: any) {
      console.error('Error loading available windows:', err)
      
      let errorMessage = 'Failed to load available time slots'
      const errMsg = err.message?.toLowerCase() || ''
      
      if (errMsg.includes('network') || errMsg.includes('fetch') || errMsg.includes('connection')) {
        errorMessage = 'Connection error. Please check your internet connection and try again.'
        toast.error('Connection Problem', {
          description: 'Unable to load time slots. Please check your connection.',
          duration: 5000
        })
      } else if (errMsg.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.'
        toast.error('Request Timeout', {
          description: 'The request is taking too long. Please try again.',
          duration: 5000
        })
      } else if (errMsg.includes('server') || errMsg.includes('internal')) {
        errorMessage = 'Server error. Please try again in a few minutes.'
        toast.error('Server Error', {
          description: 'Our servers are experiencing issues. Please try again shortly.',
          duration: 5000
        })
      } else {
        toast.error('Failed to Load Slots', {
          description: err.message || 'Please try again or contact support.',
          duration: 5000
        })
      }
      
      setError(errorMessage)
      setAvailableWindows([])
    } finally {
      setWindowsLoading(false)
    }
  }
  
  const updateFormData = (field: keyof BookingFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  const updateAddress = (field: keyof BookingFormData['address'], value: string) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }))
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      // Validate form with specific error messages
      if (!formData.selected_window) {
        const errorMsg = 'Please select a time window for your booking'
        setError(errorMsg)
        toast.error('Missing Selection', {
          description: errorMsg,
          duration: 4000
        })
        return
      }
      
      if (!formData.address.street || !formData.address.city || !formData.address.zip_code) {
        const errorMsg = 'Please fill in all required address fields'
        setError(errorMsg)
        toast.error('Incomplete Address', {
          description: 'Street address, city, and ZIP code are required.',
          duration: 4000
        })
        return
      }
      
      if (formData.estimated_weight <= 0) {
        const errorMsg = 'Please enter a valid estimated weight'
        setError(errorMsg)
        toast.error('Invalid Weight', {
          description: 'Weight must be greater than 0 pounds.',
          duration: 4000
        })
        return
      }

      // Show loading toast
      const loadingToast = toast.loading('Creating your booking...', {
        description: `Scheduling ${formData.pickup_or_drop} for ${formData.selected_window.display}`,
        duration: Infinity
      })
      
      const idempotencyKey = generateIdempotencyKey()
      
      // Create booking with timeout handling
      const bookingPromise = supabase.functions.invoke('create-booking', {
        body: {
          quote_id: quoteId ? parseInt(quoteId) : null,
          shipment_id: shipmentId ? parseInt(shipmentId) : null,
          window_start: formData.selected_window.start,
          window_end: formData.selected_window.end,
          address: formData.address,
          pickup_or_drop: formData.pickup_or_drop,
          service_type: formData.service_type,
          estimated_weight: formData.estimated_weight,
          notes: formData.notes,
          idempotency_key: idempotencyKey
        }
      })
      
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - please try again')), 30000) // 30 second timeout
      })
      
      const { data, error } = await Promise.race([bookingPromise, timeoutPromise]) as any
      
      // Dismiss loading toast
      toast.dismiss(loadingToast)
      
      if (error) {
        throw error
      }
      
      if (data?.error) {
        throw new Error(data.error.message || data.error.code || 'Booking creation failed')
      }
      
      const bookingResult = data?.data
      if (!bookingResult?.booking) {
        throw new Error('Invalid response format - please try again')
      }
      
      // Success handling
      setCreatedBooking(bookingResult.booking)
      setSuccess(true)
      
      // Show success toast
      toast.success('Booking Created Successfully!', {
        description: `Your ${formData.pickup_or_drop} has been scheduled for ${formData.selected_window.display}`,
        duration: 6000
      })
      
      // Clear any existing errors
      setError('')
      
    } catch (err: any) {
      console.error('Booking creation error:', err)
      
      // Use comprehensive error handling
      const userFriendlyError = handleBookingError(err, formData)
      setError(userFriendlyError)
      
      // Refresh available windows if it might be a timing/capacity issue
      if (err.message?.toLowerCase().includes('conflict') || err.message?.toLowerCase().includes('capacity')) {
        console.log('Refreshing available windows due to booking conflict...')
        setTimeout(() => {
          loadAvailableWindows()
        }, 1500)
      }
      
    } finally {
      setLoading(false)
    }
  }
  
  const formatDateTime = (dateTimeString: string) => {
    return new Date(dateTimeString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }
  
  // Success state
  if (success && createdBooking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-green-600 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Booking Created Successfully!
            </CardTitle>
            <CardDescription>
              Your {formData.pickup_or_drop} has been scheduled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 font-medium mb-2">
                  Booking ID: {createdBooking.id}
                </p>
                <div className="text-xs text-green-600 space-y-1">
                  <p><strong>Time:</strong> {formatDateTime(createdBooking.window_start)}</p>
                  <p><strong>Address:</strong> {createdBooking.address.street}, {createdBooking.address.city}, {createdBooking.address.state} {createdBooking.address.zip_code}</p>
                  <p><strong>Weight:</strong> {createdBooking.estimated_weight} lbs</p>
                  {createdBooking.assigned_vehicle && (
                    <p><strong>Vehicle:</strong> {createdBooking.assigned_vehicle.name}</p>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => navigate('/dashboard')} 
                  className="flex-1"
                  variant="default"
                >
                  Return to Dashboard
                </Button>
                <Button 
                  onClick={() => {
                    setSuccess(false)
                    setCreatedBooking(null)
                    setSelectedDate(undefined)
                    setFormData(prev => ({ ...prev, selected_window: undefined }))
                    setAvailableWindows([])
                  }} 
                  className="flex-1"
                  variant="outline"
                >
                  Book Another
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Schedule Pickup/Drop-off</h1>
          <p className="text-gray-600 mt-1">Book a convenient time slot for your shipment</p>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
              <CardDescription>Choose your service type and requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Service Type</Label>
                  <Select 
                    value={formData.pickup_or_drop} 
                    onValueChange={(value: 'pickup' | 'dropoff') => updateFormData('pickup_or_drop', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pickup">Pickup</SelectItem>
                      <SelectItem value="dropoff">Drop-off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select 
                    value={formData.service_type} 
                    onValueChange={(value: 'standard' | 'express') => updateFormData('service_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="express">Express (+25%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Estimated Weight (lbs)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="100"
                    value={formData.estimated_weight || ''}
                    onChange={(e) => updateFormData('estimated_weight', parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
              <CardDescription>
                {formData.pickup_or_drop === 'pickup' ? 'Where should we pick up your shipment?' : 'Where should we drop off your shipment?'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label>Street Address</Label>
                  <Input
                    placeholder="123 Main St"
                    value={formData.address.street}
                    onChange={(e) => updateAddress('street', e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    placeholder="Hoboken"
                    value={formData.address.city}
                    onChange={(e) => updateAddress('city', e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Select value={formData.address.state} onValueChange={(value) => updateAddress('state', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NJ">New Jersey</SelectItem>
                        <SelectItem value="NY">New York</SelectItem>
                        <SelectItem value="PA">Pennsylvania</SelectItem>
                        <SelectItem value="CT">Connecticut</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>ZIP Code</Label>
                    <Input
                      placeholder="07030"
                      value={formData.address.zip_code}
                      onChange={(e) => updateAddress('zip_code', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Date Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Date</CardTitle>
              <CardDescription>Choose a date for your {formData.pickup_or_drop}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[280px] justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const maxDate = new Date(today)
                        maxDate.setDate(maxDate.getDate() + 30)
                        return date < today || date > maxDate
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
          
          {/* Time Windows */}
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Available Time Windows
                  {windowsLoading && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                </CardTitle>
                <CardDescription>
                  Select a time window for {format(selectedDate, "EEEE, MMMM d, yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {windowsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-2">Loading available windows...</span>
                  </div>
                ) : availableWindows.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableWindows.map((window, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => updateFormData('selected_window', window)}
                        className={cn(
                          "p-4 border rounded-lg text-left transition-colors hover:border-blue-500",
                          formData.selected_window === window 
                            ? "border-blue-500 bg-blue-50" 
                            : "border-gray-200 bg-white"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{window.display}</span>
                          {formData.selected_window === window && (
                            <CheckCircle className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center">
                            <Truck className="h-3 w-3 mr-1" />
                            {window.assigned_vehicle.name}
                          </div>
                          <div className="flex items-center">
                            <Package className="h-3 w-3 mr-1" />
                            {window.remaining_capacity_lbs} lbs capacity left
                          </div>
                          {window.estimated_travel_time_minutes && (
                            <div className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              ~{window.estimated_travel_time_minutes} min travel
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Time Windows Available</h3>
                    <p className="text-gray-600">
                      {formData.estimated_weight > 0 && formData.address.zip_code
                        ? 'No available time slots for the selected date and requirements.'
                        : 'Please fill in weight and ZIP code to see available windows.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Special Instructions</CardTitle>
              <CardDescription>Any special requirements or notes for the driver</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="e.g., Ring doorbell, packages in garage, fragile items..."
                value={formData.notes}
                onChange={(e) => updateFormData('notes', e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
          
          {/* Submit */}
          <div className="flex justify-end">
            <Button 
              type="submit" 
              size="lg" 
              disabled={loading || !formData.selected_window}
              className="min-w-[200px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Booking...
                </>
              ) : (
                <>Schedule {formData.pickup_or_drop}</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}