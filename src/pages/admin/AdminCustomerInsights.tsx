import React, { useState, useEffect } from 'react'
import {
  Search,
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  Calendar,
  DollarSign,
  TrendingUp,
  MessageCircle,
  Bell,
  Clock,
  Star,
  AlertCircle,
  CheckCircle,
  Activity,
  BarChart3
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface Customer {
  id: string
  email: string
  created_at: string
  profile?: {
    full_name?: string
    phone?: string
    company_name?: string
  }
}

interface CustomerBooking {
  id: string
  window_start: string
  window_end: string
  status: string
  service_type: string
  estimated_weight: number
  address: any
  notes: string
  created_at: string
}

interface CustomerAnalytics {
  total_bookings: number
  total_weight_shipped: number
  avg_booking_value: number
  preferred_service_type: string
  booking_frequency: string
  seasonal_patterns: any[]
  risk_score: number
  satisfaction_score: number
  communication_preferences: string[]
}

const AdminCustomerInsights: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerBookings, setCustomerBookings] = useState<CustomerBooking[]>([])
  const [customerAnalytics, setCustomerAnalytics] = useState<CustomerAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'analytics' | 'communication'>('overview')

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchCustomers()
    }
  }, [searchTerm])

  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerDetails(selectedCustomer.id)
    }
  }, [selectedCustomer])

  const searchCustomers = async () => {
    try {
      setLoading(true)
      
      // Use auth.users to search for customers
      const { data, error } = await supabase
        .from('auth.users')
        .select('id, email, created_at, raw_user_meta_data')
        .or(`email.ilike.%${searchTerm}%`)
        .limit(10)

      if (error) {
        // Fallback to getting customers from bookings
        const { data: bookingData } = await supabase.functions.invoke('admin-list-bookings', {
          body: {
            searchTerm,
            limit: 10
          }
        })
        
        const uniqueCustomers = bookingData?.data?.bookings?.reduce((acc: any[], booking: any) => {
          const existingCustomer = acc.find(c => c.id === booking.customer_id)
          if (!existingCustomer) {
            acc.push({
              id: booking.customer_id,
              email: booking.customer_email || 'N/A',
              created_at: booking.created_at
            })
          }
          return acc
        }, []) || []
        
        setCustomers(uniqueCustomers)
      } else {
        setCustomers(data.map(user => ({
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          profile: user.raw_user_meta_data
        })))
      }
    } catch (err) {
      console.error('Error searching customers:', err)
      toast.error('Failed to search customers')
    } finally {
      setLoading(false)
    }
  }

  const loadCustomerDetails = async (customerId: string) => {
    try {
      setLoading(true)
      
      // Get customer bookings
      const { data: bookingsData } = await supabase.functions.invoke('admin-list-bookings', {
        body: {
          customerId,
          limit: 50
        }
      })

      setCustomerBookings(bookingsData?.data?.bookings || [])

      // Calculate analytics from bookings
      const bookings = bookingsData?.data?.bookings || []
      if (bookings.length > 0) {
        const analytics: CustomerAnalytics = {
          total_bookings: bookings.length,
          total_weight_shipped: bookings.reduce((sum: number, b: any) => sum + (parseFloat(b.estimated_weight) || 0), 0),
          avg_booking_value: 0, // Would need pricing data
          preferred_service_type: getMostFrequent(bookings.map((b: any) => b.service_type)),
          booking_frequency: calculateFrequency(bookings),
          seasonal_patterns: [],
          risk_score: calculateRiskScore(bookings),
          satisfaction_score: 85, // Mock data
          communication_preferences: ['email', 'sms']
        }
        setCustomerAnalytics(analytics)
      }
    } catch (err) {
      console.error('Error loading customer details:', err)
      toast.error('Failed to load customer details')
    } finally {
      setLoading(false)
    }
  }

  const getMostFrequent = (arr: string[]) => {
    const frequency = arr.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b, '')
  }

  const calculateFrequency = (bookings: any[]) => {
    if (bookings.length === 0) return 'No history'
    if (bookings.length === 1) return 'First time'
    
    const daysSinceFirst = Math.floor(
      (Date.now() - new Date(bookings[bookings.length - 1].created_at).getTime()) / (1000 * 60 * 60 * 24)
    )
    const frequency = bookings.length / Math.max(daysSinceFirst / 30, 1)
    
    if (frequency >= 1) return 'Weekly'
    if (frequency >= 0.25) return 'Monthly'
    return 'Occasional'
  }

  const calculateRiskScore = (bookings: any[]) => {
    let risk = 0
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length
    const cancellationRate = cancelledBookings / bookings.length
    
    if (cancellationRate > 0.3) risk += 30
    if (cancellationRate > 0.2) risk += 20
    if (cancellationRate > 0.1) risk += 10
    
    return Math.min(risk, 100)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customer Insights</h1>
        <p className="text-gray-600 mt-1">360-degree customer view with behavioral analytics</p>
      </div>

      {/* Customer Search */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="max-w-md">
          <label htmlFor="customer-search" className="block text-sm font-medium text-gray-700 mb-2">
            Search Customers
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              id="customer-search"
              type="text"
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Customer Search Results */}
        {searchTerm.length >= 2 && (
          <div className="mt-4">
            {loading ? (
              <div className="animate-pulse space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedCustomer?.id === customer.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {customer.profile?.full_name || customer.email}
                          </p>
                          <p className="text-sm text-gray-500">{customer.email}</p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Joined {new Date(customer.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
                {customers.length === 0 && !loading && (
                  <p className="text-gray-500 text-center py-4">No customers found</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Customer Details */}
      {selectedCustomer && (
        <div className="space-y-6">
          {/* Customer Profile Header */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedCustomer.profile?.full_name || selectedCustomer.email}
                  </h2>
                  <p className="text-gray-600">{selectedCustomer.email}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Customer since {new Date(selectedCustomer.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {customerAnalytics && (
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                      customerAnalytics.risk_score < 20 ? 'bg-green-100 text-green-800' :
                      customerAnalytics.risk_score < 50 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {customerAnalytics.risk_score < 20 ? 'Low Risk' :
                       customerAnalytics.risk_score < 50 ? 'Medium Risk' : 'High Risk'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Risk Score: {customerAnalytics.risk_score}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(customerAnalytics.satisfaction_score / 20)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Satisfaction: {customerAnalytics.satisfaction_score}%</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Customer Analytics Summary */}
          {customerAnalytics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{customerAnalytics.total_bookings}</p>
                    <p className="text-sm text-gray-500">{customerAnalytics.booking_frequency}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Weight</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{customerAnalytics.total_weight_shipped.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">lbs shipped</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-50">
                    <Package className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Preferred Service</p>
                    <p className="text-lg font-bold text-gray-900 mt-2 capitalize">{customerAnalytics.preferred_service_type}</p>
                    <p className="text-sm text-gray-500">Most used</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Booking Value</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">${customerAnalytics.avg_booking_value}</p>
                    <p className="text-sm text-gray-500">Estimated</p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-50">
                    <DollarSign className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Customer Details Tabs */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex">
                {[
                  { key: 'overview', label: 'Overview', icon: Activity },
                  { key: 'bookings', label: 'Booking History', icon: Calendar },
                  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
                  { key: 'communication', label: 'Communication', icon: MessageCircle }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as any)}
                    className={`flex items-center px-6 py-3 border-b-2 font-medium text-sm ${
                      activeTab === key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 text-gray-400 mr-3" />
                          <span className="text-sm text-gray-900">{selectedCustomer.email}</span>
                        </div>
                        {selectedCustomer.profile?.phone && (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 text-gray-400 mr-3" />
                            <span className="text-sm text-gray-900">{selectedCustomer.profile.phone}</span>
                          </div>
                        )}
                        {selectedCustomer.profile?.company_name && (
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-3" />
                            <span className="text-sm text-gray-900">{selectedCustomer.profile.company_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                      <div className="space-y-3">
                        {customerBookings.slice(0, 5).map((booking) => (
                          <div key={booking.id} className="flex items-start">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <Package className="h-4 w-4 text-blue-600" />
                              </div>
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                Booking #{booking.id.slice(-8)}
                              </p>
                              <p className="text-sm text-gray-500">
                                {formatDate(booking.window_start)}
                              </p>
                            </div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bookings Tab */}
              {activeTab === 'bookings' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking History</h3>
                  <div className="space-y-4">
                    {customerBookings.map((booking) => (
                      <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-gray-900">
                                Booking #{booking.id.slice(-8)}
                              </h4>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                                {booking.status}
                              </span>
                            </div>
                            <div className="mt-2 text-sm text-gray-600">
                              <p><strong>Service:</strong> {booking.service_type} | <strong>Weight:</strong> {booking.estimated_weight} lbs</p>
                              <p><strong>Time:</strong> {formatDate(booking.window_start)} - {formatDate(booking.window_end)}</p>
                              <p><strong>Address:</strong> {booking.address.street}, {booking.address.city}, {booking.address.state}</p>
                              {booking.notes && <p><strong>Notes:</strong> {booking.notes}</p>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {customerBookings.length === 0 && (
                      <p className="text-gray-500 text-center py-8">No bookings found for this customer</p>
                    )}
                  </div>
                </div>
              )}

              {/* Analytics Tab */}
              {activeTab === 'analytics' && customerAnalytics && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Analytics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Booking Patterns</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Booking Frequency:</span>
                          <span className="text-sm font-medium text-gray-900">{customerAnalytics.booking_frequency}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Preferred Service:</span>
                          <span className="text-sm font-medium text-gray-900 capitalize">{customerAnalytics.preferred_service_type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Risk Score:</span>
                          <span className={`text-sm font-medium ${
                            customerAnalytics.risk_score < 20 ? 'text-green-600' :
                            customerAnalytics.risk_score < 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {customerAnalytics.risk_score}/100
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Communication Preferences</h4>
                      <div className="space-y-2">
                        {customerAnalytics.communication_preferences.map((pref, index) => (
                          <div key={index} className="flex items-center">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                            <span className="text-sm text-gray-900 capitalize">{pref}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Communication Tab */}
              {activeTab === 'communication' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Communication History</h3>
                  <div className="text-center py-12">
                    <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Communication Tracking</h4>
                    <p className="text-gray-600 mb-6">Track all customer communications and interactions here.</p>
                    <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                      Send Message
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No Customer Selected State */}
      {!selectedCustomer && searchTerm.length < 2 && (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Customer Insights</h3>
          <p className="text-gray-600 mb-6">Search for a customer above to view their complete profile and analytics.</p>
          <div className="flex justify-center space-x-4">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              View All Customers
            </button>
            <button className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
              Export Customer Data
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminCustomerInsights