import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link, useNavigate } from 'react-router-dom'
import { logger } from '@/lib/logger'
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
  User,
  Inbox,
  Trash2
} from 'lucide-react'
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation'
import { useVirtualAddress } from '@/hooks/useVirtualAddress'
import VirtualAddressCard from '@/components/VirtualAddressCard'
import { featureFlags } from '@/lib/featureFlags'

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

interface Quote {
  id: number
  quote_reference: string
  email: string
  full_name: string
  destination_id: number
  total_cost: number
  status: string
  quote_expires_at: string
  created_at: string
  quote_metadata?: {
    destination?: {
      city?: string
      country?: string
    }
    transit_label?: string
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
  active_quotes: number
}

type PackageStatus =
  | 'received_at_warehouse'
  | 'pending_pickup'
  | 'picked_up'
  | 'forwarded'
  | 'disposed'

interface ReceivedPackage {
  id: string
  tracking_number: string
  status: PackageStatus
  created_at: string
  notes: string | null
  carrier: string | null
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
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [receivedPackages, setReceivedPackages] = useState<ReceivedPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const { address, loading: addressLoading, error: addressError, fetchAddress, hasFetched } = useVirtualAddress()

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      return
    }

    if (!featureFlags.virtualMailboxUi && !hasFetched && !addressLoading) {
      fetchAddress()
    }
  }, [user, hasFetched, addressLoading, fetchAddress])

  const handleSignOut = async () => {
    try {
      setSigningOut(true)
      const { error } = await signOut()
      if (error) {
        logger.error('Sign out error', error, {
          component: 'CustomerDashboard',
          action: 'handleSignOut'
        })
        setError('Failed to sign out. Please try again.')
      } else {
        navigate('/auth/login', { replace: true })
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      logger.error('Sign out error', error, {
        component: 'CustomerDashboard',
        action: 'handleSignOut'
      })
      setError('Failed to sign out. Please try again.')
    } finally {
      setSigningOut(false)
    }
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError('')

      // Load all data in parallel for better performance
      const [
        profileResult,
        shipmentsResult,
        bookingsResult,
        quotesResult,
        receivedPackagesResult
      ] = await Promise.all([
        // Load user profile
        supabase
          .from('user_profiles')
          .select('first_name, last_name, company_name')
          .eq('user_id', user?.id)
          .maybeSingle(),

        // Load recent shipments using the edge function
        supabase.functions.invoke('get-shipments', {
          body: { limit: 5, offset: 0, sort_by: 'created_at', sort_order: 'desc' }
        }),

        // Load upcoming bookings
        supabase
          .from('bookings')
          .select('*')
          .eq('customer_id', user?.id)
          .in('status', ['pending', 'confirmed'])
          .gte('window_start', new Date().toISOString())
          .order('window_start', { ascending: true })
          .limit(5),

        // Load quotes
        supabase
          .from('shipping_quotes')
          .select('*')
          .eq('customer_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(5),

        // Load recently received packages
        supabase
          .from('received_packages')
          .select('id, tracking_number, status, created_at, notes, carrier')
          .order('created_at', { ascending: false })
          .limit(10)
      ])

      // Handle profile data
      const { data: profileData, error: profileError } = profileResult
      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError
      }
      setProfile(profileData)

      // Handle shipments data
      const { data: shipmentsResponse, error: shipmentsError } = shipmentsResult
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
        estimated_cost: parseFloat(shipment.total_declared_value) || 0,
        created_at: shipment.created_at,
        latest_tracking: shipment.latest_tracking ? {
          location: shipment.latest_tracking.location,
          timestamp: shipment.latest_tracking.timestamp
        } : undefined
      }))

      setRecentShipments(formattedShipments)

      // Handle bookings data
      const { data: bookingsData, error: bookingsError } = bookingsResult
      if (!bookingsError) {
        setUpcomingBookings(bookingsData || [])
      }

      // Handle quotes data
      const { data: quotesData, error: quotesError } = quotesResult
      if (!quotesError) {
        setQuotes(quotesData || [])
      }

      const { data: receivedPackagesData, error: receivedPackagesError } = receivedPackagesResult
      if (!receivedPackagesError) {
        const sanitized = (receivedPackagesData || []).map((pkg: any) => ({
          id: pkg.id,
          tracking_number: pkg.tracking_number,
          status: (pkg.status || 'received_at_warehouse') as PackageStatus,
          created_at: pkg.created_at,
          notes: pkg.notes,
          carrier: pkg.carrier
        })) as ReceivedPackage[]

        setReceivedPackages(sanitized)
      }

      // Calculate stats
      const activeQuotes = (quotesData || []).filter((q: Quote) => {
        const now = new Date()
        const expires = new Date(q.quote_expires_at)
        return q.status === 'pending' && expires > now
      }).length

      const dashboardStats: DashboardStats = {
        total_shipments: shipments.length,
        pending_shipments: shipments.filter((s: any) => ['pending_pickup', 'picked_up', 'processing'].includes(s.status)).length,
        in_transit_shipments: shipments.filter((s: any) => ['in_transit', 'customs_clearance', 'out_for_delivery'].includes(s.status)).length,
        delivered_shipments: shipments.filter((s: any) => s.status === 'delivered').length,
        total_spent: shipments.reduce((sum: number, s: any) => sum + (parseFloat(s.total_declared_value) || 0), 0),
        pending_documents: 0, // Document counting feature not yet implemented
        upcoming_bookings: (bookingsData || []).length,
        active_quotes: activeQuotes
      }

      setStats(dashboardStats)

    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      logger.error('Dashboard loading error', error, {
        component: 'CustomerDashboard',
        action: 'loadDashboardData'
      })
      setError(error.message || 'Failed to load dashboard data')
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getPackageStatusBadge = (status: PackageStatus) => {
    const badgeClassMap: Record<PackageStatus, string> = {
      received_at_warehouse: 'text-blue-600 border-blue-200 bg-blue-50',
      pending_pickup: 'text-amber-600 border-amber-200 bg-amber-50',
      picked_up: 'text-green-600 border-green-200 bg-green-50',
      forwarded: 'text-violet-600 border-violet-200 bg-violet-50',
      disposed: 'text-red-600 border-red-200 bg-red-50'
    }

    const labelMap: Record<PackageStatus, string> = {
      received_at_warehouse: 'At Warehouse',
      pending_pickup: 'Ready for Pickup',
      picked_up: 'Picked Up',
      forwarded: 'Forwarded',
      disposed: 'Disposed'
    }

    const IconMap: Record<PackageStatus, typeof Package> = {
      received_at_warehouse: Package,
      pending_pickup: Clock,
      picked_up: CheckCircle,
      forwarded: Truck,
      disposed: Trash2
    }

    const Icon = IconMap[status]

    return (
      <Badge variant="outline" className={badgeClassMap[status]}>
        <Icon className="h-3 w-3 mr-1" />
        {labelMap[status]}
      </Badge>
    )
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
          <div className="rounded-2xl border border-slate-200 bg-violet-50/40 p-4">
            <div className="text-slate-600 text-sm">Active Quotes</div>
            <div className="mt-1 text-3xl font-bold text-shopify-maroon">{stats?.active_quotes || 0}</div>
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

        {/* Received Packages */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900">Recently Received Packages</h2>
            {receivedPackages.length > 0 && (
              <span className="text-xs text-slate-500">Showing the 10 most recent entries</span>
            )}
          </div>
          {receivedPackages.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 p-6 text-center">
              <Inbox className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <h3 className="font-medium text-slate-900 mb-1">No packages waiting</h3>
              <p className="text-sm text-slate-600">
                We'll let you know as soon as something arrives for your virtual mailbox.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {receivedPackages.map((pkg) => (
                <div key={pkg.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono text-sm text-slate-900">{pkg.tracking_number}</p>
                      <p className="text-xs text-slate-500">Logged {formatDateTime(pkg.created_at)}</p>
                      {pkg.notes && <p className="text-xs text-amber-600 mt-1">Note: {pkg.notes}</p>}
                    </div>
                    <div className="text-right space-y-2">
                      {getPackageStatusBadge(pkg.status)}
                      <p className="text-xs text-slate-500">{pkg.carrier || 'Carrier TBD'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Quotes - compact cards */}
        {quotes.length > 0 && (
          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-900">Recent Quotes</h2>
              <Link to="/dashboard/quotes" className="text-sm text-shopify-pink hover:text-shopify-maroon">
                View All
              </Link>
            </div>
            <div className="space-y-2">
              {quotes.map((quote) => {
                const expires = new Date(quote.quote_expires_at)
                const now = new Date()
                const isExpired = expires < now
                const isExpiringSoon = expires < new Date(now.getTime() + 48 * 60 * 60 * 1000)
                const destination = quote.quote_metadata?.destination
                  ? [quote.quote_metadata.destination.city, quote.quote_metadata.destination.country]
                      .filter(Boolean)
                      .join(', ')
                  : 'Destination TBD'

                return (
                  <div key={quote.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-slate-900">{quote.quote_reference}</p>
                          <Badge
                            variant="outline"
                            className={
                              isExpired
                                ? 'text-slate-600 border-slate-300 bg-slate-50'
                                : quote.status === 'won'
                                ? 'text-green-600 border-green-200 bg-green-50'
                                : 'text-violet-600 border-violet-200 bg-violet-50'
                            }
                          >
                            {isExpired ? 'Expired' : quote.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">{destination}</p>
                        {quote.quote_metadata?.transit_label && (
                          <p className="text-xs text-slate-500">Transit: {quote.quote_metadata.transit_label}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-slate-900">{formatCurrency(quote.total_cost)}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isExpired
                              ? 'text-slate-500'
                              : isExpiringSoon
                              ? 'text-amber-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {isExpired ? 'Expired' : `Expires ${formatDate(quote.quote_expires_at)}`}
                        </p>
                      </div>
                    </div>
                    {!isExpired && quote.status === 'pending' && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                        <Link
                          to={`/dashboard/quotes`}
                          className="text-sm text-shopify-pink hover:text-shopify-maroon font-medium"
                        >
                          View Quote Details →
                        </Link>
                        <span className="text-slate-300">|</span>
                        <Link
                          to="/booking"
                          className="text-sm text-shopify-pink hover:text-shopify-maroon font-medium"
                        >
                          Schedule Booking →
                        </Link>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent Shipments - compact cards */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900">Recent Shipments</h2>
            {/* TODO: Create ShipmentsListPage - link temporarily removed */}
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
                <Link
                  key={shipment.id}
                  to={`/dashboard/shipments/${shipment.id}`}
                  className="block rounded-2xl border border-slate-200 p-4 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
                >
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
                </Link>
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
