import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link, useNavigate } from 'react-router-dom'
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
  pending_pickup: { label: 'Pending Pickup', color: 'orange', icon: Clock },
  picked_up: { label: 'Picked Up', color: 'blue', icon: Truck },
  processing: { label: 'Processing', color: 'blue', icon: Package },
  in_transit: { label: 'In Transit', color: 'purple', icon: MapPin },
  customs_clearance: { label: 'Customs', color: 'yellow', icon: AlertCircle },
  out_for_delivery: { label: 'Out for Delivery', color: 'green', icon: Truck },
  delivered: { label: 'Delivered', color: 'green', icon: CheckCircle },
  exception: { label: 'Exception', color: 'red', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'gray', icon: AlertCircle }
}

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

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

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
      <Badge variant="outline" className={`text-${config.color}-600 border-${config.color}-200 bg-${config.color}-50`}>
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
      <div className="min-h-screen bg-gray-50 p-6">
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back{profile ? `, ${profile.first_name}` : ''}!
              </h1>
              <p className="text-gray-600 mt-1">
                {profile?.company_name ? `${profile.company_name} • ` : ''}Manage your shipments and track deliveries
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button asChild>
                <Link to="/dashboard/create-shipment">
                  <Plus className="h-4 w-4 mr-2" />
                  New Shipment
                </Link>
              </Button>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>{user?.email}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  {signingOut ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900 mr-2"></div>
                      Signing out...
                    </>
                  ) : (
                    <>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Shipments</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.total_shipments || 0}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Upcoming Bookings</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.upcoming_bookings || 0}</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Transit</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.in_transit_shipments || 0}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <Truck className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Spent</p>
                  <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats?.total_spent || 0)}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Shipments */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Recent Shipments</CardTitle>
                <CardDescription>Your latest shipping activity</CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link to="/dashboard/shipments">
                  View All
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentShipments.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No shipments yet</h3>
                <p className="text-gray-600 mb-4">Start by creating your first shipment</p>
                <Button asChild>
                  <Link to="/dashboard/create-shipment">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Shipment
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentShipments.map((shipment) => (
                  <div key={shipment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Package className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          To {shipment.destination_country}
                        </p>
                        <p className="text-sm text-gray-600">
                          {shipment.total_weight} lbs • {formatDate(shipment.created_at)}
                        </p>
                        {shipment.latest_tracking && (
                          <p className="text-xs text-gray-500">
                            Last seen: {shipment.latest_tracking.location}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(shipment.status)}
                      <p className="text-sm text-gray-600 mt-1">
                        {formatCurrency(shipment.estimated_cost)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Upcoming Bookings</CardTitle>
                <CardDescription>Your scheduled pickups and drop-offs</CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link to="/booking">
                  Schedule New
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming bookings</h3>
                <p className="text-gray-600 mb-4">Schedule a pickup or drop-off for your next shipment</p>
                <Button asChild>
                  <Link to="/booking">
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Booking
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => {
                  const windowStart = new Date(booking.window_start)
                  const windowEnd = new Date(booking.window_end)
                  
                  return (
                    <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="bg-orange-100 p-2 rounded-full">
                          <Clock className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 capitalize">
                            {booking.pickup_or_drop} - {booking.estimated_weight} lbs
                          </p>
                          <p className="text-sm text-gray-600">
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
                          <p className="text-xs text-gray-500">
                            {booking.address?.street}, {booking.address?.city}, {booking.address?.state}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                          className={booking.status === 'confirmed' ? 'bg-green-600' : ''}
                        >
                          {booking.status}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1 capitalize">
                          {booking.service_type} service
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Link to="/dashboard/create-shipment" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6 text-center">
                <div className="bg-blue-100 p-3 rounded-full w-fit mx-auto mb-4">
                  <Plus className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Create Shipment</h3>
                <p className="text-sm text-gray-600">Start a new shipment to the Caribbean</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/booking" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6 text-center">
                <div className="bg-orange-100 p-3 rounded-full w-fit mx-auto mb-4">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Schedule Booking</h3>
                <p className="text-sm text-gray-600">Book pickup or drop-off time slots</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/tracking" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6 text-center">
                <div className="bg-purple-100 p-3 rounded-full w-fit mx-auto mb-4">
                  <MapPin className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Track Shipment</h3>
                <p className="text-sm text-gray-600">Follow your packages in real-time</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}