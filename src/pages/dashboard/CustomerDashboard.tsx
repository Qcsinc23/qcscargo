import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/layout/AuthLayout'
import {
  Package,
  Plus,
  TrendingUp,
  Clock,
  FileText,
  MapPin,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Truck,
  LogOut,
  User
} from 'lucide-react'
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation'
import { useVirtualAddress } from '@/hooks/useVirtualAddress'
import VirtualAddressCard from '@/components/VirtualAddressCard'

interface UserProfile {
  first_name: string
  last_name: string
  company_name?: string
}

interface Booking {
  id: string
  pickup_or_drop: string
  window_start: string
  window_end: string
  address: any
  status: string
  service_type: string
  estimated_weight: number
  created_at: string
}

interface ShipmentSummary {
  id: string
  status: string
  destination_country: string
  total_weight: number
  estimated_cost: number
  created_at: string
  latest_tracking?: {
    location: string
    timestamp: string
  }
}

interface DashboardStats {
  total_shipments: number
  pending_shipments: number
  in_transit_shipments: number
  delivered_shipments: number
  total_spent: number
  pending_documents: number
  upcoming_bookings: number
}

const statusConfig = {
  pending_pickup: {
    label: 'Pending Pickup',
    icon: Clock,
    badgeClass: 'text-orange-600 border-orange-200 bg-orange-50'
  },
  picked_up: {
    label: 'Picked Up',
    icon: Truck,
    badgeClass: 'text-blue-600 border-blue-200 bg-blue-50'
  },
  processing: {
    label: 'Processing',
    icon: Package,
    badgeClass: 'text-blue-600 border-blue-200 bg-blue-50'
  },
  in_transit: {
    label: 'In Transit',
    icon: MapPin,
    badgeClass: 'text-purple-600 border-purple-200 bg-purple-50'
  },
  customs_clearance: {
    label: 'Customs',
    icon: AlertCircle,
    badgeClass: 'text-yellow-600 border-yellow-200 bg-yellow-50'
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    icon: Truck,
    badgeClass: 'text-green-600 border-green-200 bg-green-50'
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle,
    badgeClass: 'text-green-600 border-green-200 bg-green-50'
  },
  exception: {
    label: 'Exception',
    icon: AlertCircle,
    badgeClass: 'text-red-600 border-red-200 bg-red-50'
  },
  cancelled: {
    label: 'Cancelled',
    icon: AlertCircle,
    badgeClass: 'text-gray-600 border-gray-200 bg-gray-50'
  }
} as const

export default function CustomerDashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [recentShipments, setRecentShipments] = useState<ShipmentSummary[]>([])
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const { address, loading: addressLoading, error: addressError, fetchAddress } = useVirtualAddress()

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchAddress()
    }
  }, [user, fetchAddress])

  const handleSignOut = async () => {
    try {
      setSigningOut(true)
      const { error } = await signOut()
      if (error) {
        console.error('Sign out error:', error)
        setError('Failed to sign out. Please try again.')
      } else {
        navigate('/auth/login', { replace: true })
      }
    } catch (err: any) {
      console.error('Sign out error:', err)
      setError('Failed to sign out. Please try again.')
    } finally {
      setSigningOut(false)
    }
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, company_name')
        .eq('user_id', user?.id)
        .maybeSingle()

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError
      }
      setProfile(profileData)

      // Load recent shipments using the edge function
      const { data: shipmentsResponse, error: shipmentsError } = await supabase.functions.invoke('get-shipments', {
        body: { limit: 5, offset: 0, sort_by: 'created_at', sort_order: 'desc' }
      })

      if (shipmentsError) {
        throw shipmentsError
      }

      const shipments = shipmentsResponse?.data?.shipments || []
      
      // Format shipments for display
      const formattedShipments = shipments.map((shipment: any) => ({
        id: shipment.id,
        status: shipment.status,
        destination_country: shipment.destinations?.country_name || 'Unknown',
        total_weight: parseFloat(shipment.total_weight) || 0,
        estimated_cost: parseFloat(shipment.total_declared_value) || 0, // Use total_declared_value since estimated_cost doesn't exist
        created_at: shipment.created_at,
        latest_tracking: shipment.latest_tracking ? {
          location: shipment.latest_tracking.location,
          timestamp: shipment.latest_tracking.timestamp
        } : undefined
      }))
      
      setRecentShipments(formattedShipments)
      
      // Load upcoming bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', user?.id)
        .in('status', ['pending', 'confirmed'])
        .gte('window_start', new Date().toISOString())
        .order('window_start', { ascending: true })
        .limit(5)
      
      if (!bookingsError) {
        setUpcomingBookings(bookingsData || [])
      }
      
      // Calculate stats
      const dashboardStats: DashboardStats = {
        total_shipments: shipments.length,
        pending_shipments: shipments.filter((s: any) => ['pending_pickup', 'picked_up', 'processing'].includes(s.status)).length,
        in_transit_shipments: shipments.filter((s: any) => ['in_transit', 'customs_clearance', 'out_for_delivery'].includes(s.status)).length,
        delivered_shipments: shipments.filter((s: any) => s.status === 'delivered').length,
        total_spent: shipments.reduce((sum: number, s: any) => sum + (parseFloat(s.total_declared_value) || 0), 0),
        pending_documents: 0, // TODO: Count from documents when we implement document requirements
        upcoming_bookings: (bookingsData || []).length
      }
      
      setStats(dashboardStats)

    } catch (err: any) {
      console.error('Dashboard loading error:', err)
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending_pickup
    const Icon = config.icon
    
    return (
      <Badge variant="outline" className={config.badgeClass}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  // Get user name with fallback to prevent "null" greeting
  const getUserName = () => {
    if (profile?.first_name) return profile.first_name;
    if (profile?.last_name) return profile.last_name;
    if (user?.email) return user.email.split('@')[0];
    return "there";
  };

  return (
    <AuthLayout showTabs>
      <section className="px-4 pt-3 max-w-screen-md mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-[clamp(22px,5.8vw,32px)] leading-tight font-extrabold text-slate-900">
            Welcome back, {getUserName()}!
          </h1>
          <Link to="/dashboard/create-shipment" className="shrink-0 ml-3 rounded-xl px-3 py-2 bg-emerald-700 text-white font-semibold">
            + New Shipment
          </Link>
        </div>

        {/* Cards: tighten spacing on mobile */}
        <div className="mt-4 grid gap-3">
          {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          </div>
        )}
        </div>

        {/* Stats Grid - compact for mobile */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="rounded-2xl border border-slate-200 bg-rose-50/40 p-4">
            <div className="text-slate-600 text-sm">Total Shipments</div>
            <div className="mt-1 text-3xl font-bold text-shopify-maroon">{stats?.total_shipments || 0}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-purple-50/40 p-4">
            <div className="text-slate-600 text-sm">Upcoming Bookings</div>
            <div className="mt-1 text-3xl font-bold text-shopify-maroon">{stats?.upcoming_bookings || 0}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-green-50/40 p-4">
            <div className="text-slate-600 text-sm">In Transit</div>
            <div className="mt-1 text-3xl font-bold text-shopify-maroon">{stats?.in_transit_shipments || 0}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-amber-50/40 p-4">
            <div className="text-slate-600 text-sm">Total Spent</div>
            <div className="mt-1 text-3xl font-bold text-shopify-maroon">{formatCurrency(stats?.total_spent || 0)}</div>
          </div>
        </div>

        {/* Virtual Mailbox */}
        <div className="mb-6">
          {addressError && (
            <div className="mb-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <span>{addressError}</span>
              </div>
            </div>
          )}
          <VirtualAddressCard address={address} loading={addressLoading} onRefresh={fetchAddress} />
        </div>

        {/* Recent Shipments - compact cards */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900">Recent Shipments</h2>
            <Link to="/dashboard/shipments" className="text-sm text-shopify-pink hover:text-shopify-maroon">
              View All
            </Link>
          </div>
          {recentShipments.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 p-6 text-center">
              <Package className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <h3 className="font-medium text-slate-900 mb-1">No shipments yet</h3>
              <p className="text-sm text-slate-600 mb-3">Start by creating your first shipment</p>
              <Link to="/dashboard/create-shipment" className="text-sm text-shopify-pink hover:text-shopify-maroon">
                Create Shipment →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentShipments.map((shipment) => (
                <div key={shipment.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-slate-900">
                        To {shipment.destination_country}
                      </p>
                      <p className="text-sm text-slate-600">
                        {shipment.total_weight} lbs • {formatDate(shipment.created_at)}
                      </p>
                      {shipment.latest_tracking && (
                        <p className="text-xs text-slate-500">
                          Last seen: {shipment.latest_tracking.location}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {getStatusBadge(shipment.status)}
                      <p className="text-sm text-slate-600 mt-1">
                        {formatCurrency(shipment.estimated_cost)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Bookings - compact cards */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900">Upcoming Bookings</h2>
            <Link to="/booking" className="text-sm text-shopify-pink hover:text-shopify-maroon">
              Schedule New
            </Link>
          </div>
          {upcomingBookings.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 p-6 text-center">
              <Clock className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <h3 className="font-medium text-slate-900 mb-1">No upcoming bookings</h3>
              <p className="text-sm text-slate-600 mb-3">Schedule a pickup or drop-off for your next shipment</p>
              <Link to="/booking" className="text-sm text-shopify-pink hover:text-shopify-maroon">
                Schedule Booking →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingBookings.map((booking) => {
                const windowStart = new Date(booking.window_start)
                const windowEnd = new Date(booking.window_end)
                
                return (
                  <div key={booking.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-slate-900 capitalize">
                          {booking.pickup_or_drop} - {booking.estimated_weight} lbs
                        </p>
                        <p className="text-sm text-slate-600">
                          {windowStart.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })} • {windowStart.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })} - {windowEnd.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                        <p className="text-xs text-slate-500">
                          {booking.address?.street}, {booking.address?.city}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                          className={booking.status === 'confirmed' ? 'bg-green-600 text-white' : ''}
                        >
                          {booking.status}
                        </Badge>
                        <p className="text-xs text-slate-500 mt-1 capitalize">
                          {booking.service_type} service
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </AuthLayout>
  )
}
