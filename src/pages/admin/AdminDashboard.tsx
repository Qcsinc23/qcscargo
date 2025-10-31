import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  Truck,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  Package,
  AlertTriangle,
  ScanBarcode
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

interface DashboardStats {
  kpis: {
    total_bookings: number
    total_revenue: string
    average_booking_value: string
    conversion_rate: string
  }
  status_breakdown: Record<string, number>
  recent_activity: any[]
  growth_metrics: {
    booking_growth: string
    revenue_growth: string
  }
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.functions.invoke('admin-reports', {
        body: {
          report_type: 'dashboard_overview'
        }
      })

      if (error) {
        logger.error('Supabase function error', error, {
          component: 'AdminDashboard',
          action: 'loadDashboardData'
        })
        throw new Error(error.message || 'Failed to load dashboard data')
      }

      logger.debug('Dashboard data received', {
        component: 'AdminDashboard',
        action: 'loadDashboardData'
      })
      setStats(data?.data || null)
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      logger.error('Error loading dashboard data', error, {
        component: 'AdminDashboard',
        action: 'loadDashboardData'
      })
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Dashboard</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={loadDashboardData}
                className="mt-2 text-sm text-red-800 underline hover:text-red-900"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!stats && !loading && !error) {
    return <div className="p-6">No data available</div>
  }

  // Define KPI cards with safe fallbacks
  const kpiCards = [
    {
      title: 'Total Bookings',
      value: stats?.kpis?.total_bookings || 0,
      icon: Calendar,
      color: 'text-pink-700',
      bg: 'bg-pink-100',
      change: stats?.growth_metrics?.booking_growth || '+0.0%'
    },
    {
      title: 'Total Revenue',
      value: `$${stats?.kpis?.total_revenue || '0.00'}`,
      icon: DollarSign,
      color: 'text-pink-600',
      bg: 'bg-pink-50',
      change: stats?.growth_metrics?.revenue_growth || '+0.0%'
    },
    {
      title: 'Avg Booking Value',
      value: `$${stats?.kpis?.average_booking_value || '0.00'}`,
      icon: Package,
      color: 'text-rose-700',
      bg: 'bg-rose-50',
      change: '+2.1%'
    },
    {
      title: 'Conversion Rate',
      value: stats?.kpis?.conversion_rate || '0.0%',
      icon: TrendingUp,
      color: 'text-pink-600',
      bg: 'bg-pink-50',
      change: '+0.5%'
    }
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-rose-900">Dashboard Overview</h1>
        <p className="text-pink-600 mt-1">Monitor your logistics operations in real-time</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpiCards.map((kpi, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-pink-600">{kpi.title}</p>
                <p className="text-2xl font-bold text-rose-900 mt-2">{kpi.value}</p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-pink-700 font-medium">{kpi.change}</span>
                  <span className="text-sm text-gray-500 ml-1">from last month</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Status Breakdown and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-rose-900 mb-4">Booking Status Breakdown</h2>
          <div className="space-y-4">
            {Object.entries(stats?.status_breakdown || {}).map(([status, count]) => {
              const total = stats?.kpis?.total_bookings || 0
              const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0'
              
              const statusColors: Record<string, string> = {
                confirmed: 'bg-pink-600',
                pending: 'bg-pink-500',
                completed: 'bg-rose-700',
                cancelled: 'bg-red-500'
              }

              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${statusColors[status] || 'bg-gray-500'} mr-3`}></div>
                    <span className="text-sm font-medium text-gray-700 capitalize">{status}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-rose-900 font-medium mr-2">{count}</span>
                    <span className="text-sm text-gray-500">({percentage}%)</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-rose-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {(stats?.recent_activity || []).slice(0, 5).map((booking) => (
              <div key={booking.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-pink-100/10 rounded-full flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-pink-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-rose-900 font-medium">
                    Booking #{booking.id.slice(-8)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {booking.address.street}, {booking.address.city}, {booking.address.state}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(booking.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    booking.status === 'confirmed' ? 'bg-pink-100 text-pink-700' :
                    booking.status === 'pending' ? 'bg-pink-100/10 text-pink-600' :
                    booking.status === 'completed' ? 'bg-rose-50 text-rose-900' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {booking.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-rose-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <button
            onClick={() => navigate('/admin/shipments')}
            className="flex items-center p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors hover:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            <Package className="h-8 w-8 text-blue-600 mr-4" />
            <div>
              <h3 className="font-medium text-rose-900">Shipment Management</h3>
              <p className="text-sm text-gray-500">Monitor all shipments</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/admin/bookings')}
            className="flex items-center p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors hover:border-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-600 focus:ring-offset-2"
          >
            <Calendar className="h-8 w-8 text-pink-600 mr-4" />
            <div>
              <h3 className="font-medium text-rose-900">View All Bookings</h3>
              <p className="text-sm text-gray-500">Manage and track bookings</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/admin/vehicles')}
            className="flex items-center p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors hover:border-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-700 focus:ring-offset-2"
          >
            <Truck className="h-8 w-8 text-pink-700 mr-4" />
            <div>
              <h3 className="font-medium text-rose-900">Vehicle Management</h3>
              <p className="text-sm text-gray-500">Optimize routes and capacity</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/admin/customers')}
            className="flex items-center p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors hover:border-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-700 focus:ring-offset-2"
          >
            <Users className="h-8 w-8 text-rose-900 mr-4" />
            <div>
              <h3 className="font-medium text-rose-900">Customer Insights</h3>
              <p className="text-sm text-gray-500">Analyze customer data</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/admin/package-receiving')}
            className="flex items-center p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors hover:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
          >
            <ScanBarcode className="h-8 w-8 text-emerald-700 mr-4" />
            <div>
              <h3 className="font-medium text-rose-900">Package Receiving</h3>
              <p className="text-sm text-gray-500">Scan and log arrivals</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
