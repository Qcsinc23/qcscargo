import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Truck,
  MapPin,
  Users,
  Package,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Route,
  Gauge,
  RefreshCw,
  Calendar,
  Plus
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface Vehicle {
  id: string
  name: string
  capacity_lbs: number
  service_area: any
  active: boolean
  base_location_zip: string
  notes: string
  capacity_info: {
    total_capacity_lbs: number
    used_capacity_lbs: number
    remaining_capacity_lbs: number
    utilization_rate: number
    efficiency_score: number
  }
  current_assignments: {
    total_bookings: number
    time_windows: any
    avg_booking_weight: number
  }
  recommendations: string[]
}

interface FleetSummary {
  total_vehicles: number
  total_fleet_capacity: number
  total_used_capacity: number
  average_utilization: number
  underutilized_count: number
  optimal_count: number
  overutilized_count: number
}

const AdminVehicleManagement: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [fleetSummary, setFleetSummary] = useState<FleetSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [viewMode, setViewMode] = useState<'capacity' | 'routes' | 'performance'>('capacity')
  const [optimizing, setOptimizing] = useState(false)

  useEffect(() => {
    loadVehicleData()
  }, [selectedDate])

  const loadVehicleData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.functions.invoke('admin-vehicle-management', {
        body: {
          action: 'list',
          date: selectedDate
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      setVehicles(data.data.vehicles)
      setFleetSummary(data.data.fleet_summary)
    } catch (err) {
      console.error('Error loading vehicle data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load vehicle data')
      toast.error('Failed to load vehicle data')
    } finally {
      setLoading(false)
    }
  }

  const optimizeRoutes = async () => {
    try {
      setOptimizing(true)
      
      const { data, error } = await supabase.functions.invoke('admin-vehicle-management', {
        body: {
          action: 'optimize_routes',
          date: selectedDate,
          optimization_params: {
            max_distance_miles: 25,
            prefer_capacity_balance: true,
            time_window_flexibility: 30
          }
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      toast.success('Route optimization completed successfully')
      await loadVehicleData() // Refresh data
    } catch (err) {
      console.error('Error optimizing routes:', err)
      toast.error('Failed to optimize routes')
    } finally {
      setOptimizing(false)
    }
  }

  const getUtilizationColor = (rate: number) => {
    if (rate < 0.3) return 'text-red-600 bg-red-100'
    if (rate < 0.7) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const getUtilizationStatus = (rate: number) => {
    if (rate < 0.3) return 'Under-utilized'
    if (rate < 0.7) return 'Optimal'
    return 'Over-utilized'
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vehicle & Fleet Management</h1>
            <p className="text-gray-600 mt-1">
              Optimize your fleet capacity and routing for {selectedDate}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={optimizeRoutes}
              disabled={optimizing}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {optimizing ? (
                <RefreshCw className="h-4 w-4 mr-2 inline animate-spin" />
              ) : (
                <Route className="h-4 w-4 mr-2 inline" />
              )}
              Optimize Routes
            </button>
            <button
              onClick={loadVehicleData}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 inline ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'capacity', label: 'Capacity Dashboard', icon: Gauge },
              { key: 'routes', label: 'Route Optimization', icon: Route },
              { key: 'performance', label: 'Performance Metrics', icon: TrendingUp }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setViewMode(key as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  viewMode === key
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
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Data</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={loadVehicleData}
                className="mt-2 text-sm text-red-800 underline hover:text-red-900"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fleet Summary Cards */}
      {fleetSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Vehicles</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{fleetSummary.total_vehicles}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50">
                <Truck className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Fleet Capacity</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{fleetSummary.total_fleet_capacity.toLocaleString()} lbs</p>
                <p className="text-sm text-gray-500 mt-1">{fleetSummary.total_used_capacity} lbs used</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Utilization</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{(fleetSummary.average_utilization * 100).toFixed(1)}%</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50">
                <Gauge className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Optimization Status</p>
                <p className="text-sm text-green-600 font-medium mt-1">{fleetSummary.optimal_count} Optimal</p>
                <p className="text-sm text-yellow-600">{fleetSummary.underutilized_count} Under-utilized</p>
                <p className="text-sm text-red-600">{fleetSummary.overutilized_count} Over-utilized</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-50">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Grid */}
      {viewMode === 'capacity' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg ${
                        vehicle.active ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Truck className={`h-6 w-6 ${
                          vehicle.active ? 'text-green-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-semibold text-gray-900">{vehicle.name}</h3>
                        <p className="text-sm text-gray-500">{vehicle.base_location_zip}</p>
                      </div>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      vehicle.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {vehicle.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Capacity Information */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Capacity Utilization</span>
                      <span className={`text-sm font-semibold px-2 py-1 rounded-full ${
                        getUtilizationColor(vehicle.capacity_info.utilization_rate)
                      }`}>
                        {(vehicle.capacity_info.utilization_rate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${
                          vehicle.capacity_info.utilization_rate < 0.3 ? 'bg-red-500' :
                          vehicle.capacity_info.utilization_rate < 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(vehicle.capacity_info.utilization_rate * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
                      <span>{vehicle.capacity_info.used_capacity_lbs} lbs used</span>
                      <span>{vehicle.capacity_info.remaining_capacity_lbs} lbs available</span>
                    </div>
                  </div>

                  {/* Current Assignments */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-700">Today's Bookings</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {vehicle.current_assignments.total_bookings}
                      </span>
                    </div>
                    {vehicle.current_assignments.avg_booking_weight > 0 && (
                      <div className="mt-2 text-sm text-gray-600">
                        Avg weight: {vehicle.current_assignments.avg_booking_weight.toFixed(0)} lbs
                      </div>
                    )}
                  </div>

                  {/* Efficiency Score */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Efficiency Score</span>
                      <div className="flex items-center">
                        <span className={`text-sm font-semibold mr-2 ${
                          vehicle.capacity_info.efficiency_score >= 80 ? 'text-green-600' :
                          vehicle.capacity_info.efficiency_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {vehicle.capacity_info.efficiency_score}/100
                        </span>
                        {vehicle.capacity_info.efficiency_score >= 80 ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  {vehicle.recommendations.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
                      <div className="space-y-1">
                        {vehicle.recommendations.slice(0, 2).map((rec, index) => (
                          <div key={index} className="flex items-start">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                            <p className="text-xs text-gray-600">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Vehicle Actions */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {getUtilizationStatus(vehicle.capacity_info.utilization_rate)}
                    </div>
                    <div className="flex space-x-2">
                      <Link 
                        to={`/admin/vehicles/${vehicle.id}`}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Details
                      </Link>
                      <Link 
                        to={`/admin/vehicles/${vehicle.id}/edit`}
                        className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                      >
                        Edit Vehicle
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Route Optimization View */}
      {viewMode === 'routes' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-center py-12">
            <Route className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Route Optimization</h3>
            <p className="text-gray-600 mb-6">Advanced route clustering and optimization tools.</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={optimizeRoutes}
                disabled={optimizing}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {optimizing ? 'Optimizing...' : 'Run Optimization'}
              </button>
              <button className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
                View Route Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics View */}
      {viewMode === 'performance' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-center py-12">
            <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Performance Analytics</h3>
            <p className="text-gray-600 mb-6">Detailed performance metrics and trends for your fleet.</p>
            <div className="flex justify-center space-x-4">
              <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                Generate Report
              </button>
              <button className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
                Export Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminVehicleManagement