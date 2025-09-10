import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Package, 
  Search, 
  Filter,
  TrendingUp,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  Truck,
  Eye,
  Edit,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

interface Shipment {
  id: string
  tracking_number: string
  status: string
  service_type: string
  total_weight?: number
  total_declared_value?: number
  created_at: string
  customer?: {
    first_name: string
    last_name: string
    company_name?: string
    email: string
  }
  destination?: {
    country_name: string
    city_name: string
  }
  items_count: number
  latest_tracking?: {
    location: string
    timestamp: string
  }
}

interface ShipmentStats {
  status_breakdown: Record<string, number>
  recent_shipments_7_days: number
  total_shipments: number
}

const statusConfig = {
  pending_pickup: { label: 'Pending Pickup', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  picked_up: { label: 'Picked Up', color: 'bg-blue-100 text-blue-800', icon: Truck },
  processing: { label: 'Processing', color: 'bg-purple-100 text-purple-800', icon: Package },
  in_transit: { label: 'In Transit', color: 'bg-indigo-100 text-indigo-800', icon: MapPin },
  customs_clearance: { label: 'Customs', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-green-100 text-green-800', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  exception: { label: 'Exception', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800', icon: AlertCircle }
}

export default function AdminShipmentManagement() {
  const navigate = useNavigate()
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [stats, setStats] = useState<ShipmentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    has_more: false
  })

  useEffect(() => {
    loadData()
  }, [statusFilter, pagination.offset])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      // Load shipments
      const shipmentsParams = new URLSearchParams({
        action: 'list',
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString()
      })
      
      if (statusFilter && statusFilter !== 'all') shipmentsParams.append('status', statusFilter)

      const { data: shipmentsResponse, error: shipmentsError } = await supabase.functions.invoke(
        'admin-shipments-management', 
        { 
          body: {
            action: 'list',
            status: statusFilter && statusFilter !== 'all' ? statusFilter : undefined,
            limit: pagination.limit,
            offset: pagination.offset
          }
        }
      )

      if (shipmentsError) {
        throw shipmentsError
      }

      if (shipmentsResponse?.data) {
        setShipments(shipmentsResponse.data.shipments || [])
        setPagination(prev => ({
          ...prev,
          total: shipmentsResponse.data.pagination?.total || 0,
          has_more: shipmentsResponse.data.pagination?.has_more || false
        }))
      }

      // Load stats
      const { data: statsResponse, error: statsError } = await supabase.functions.invoke(
        'admin-shipments-management',
        { body: { action: 'stats' } }
      )

      if (statsError) {
        console.error('Stats error:', statsError)
      } else if (statsResponse?.data) {
        setStats(statsResponse.data.stats)
      }

    } catch (err: any) {
      console.error('Error loading data:', err)
      setError(err.message || 'Failed to load shipment data')
      toast.error('Failed to load shipment data')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (shipmentId: string, newStatus: string, notes?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        'admin-shipments-management',
        {
          body: {
            action: 'update_status',
            shipment_id: shipmentId,
            status: newStatus,
            notes
          }
        }
      )

      if (error) throw error

      toast.success('Shipment status updated successfully')
      loadData() // Reload data
    } catch (err: any) {
      console.error('Error updating status:', err)
      toast.error('Failed to update shipment status')
    }
  }

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending_pickup
    const Icon = config.icon
    
    return (
      <Badge variant="outline" className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading && shipments.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Shipment Management</h1>
        <p className="text-gray-600 mt-1">Monitor and manage all customer shipments</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Shipments</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_shipments}</p>
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
                  <p className="text-sm font-medium text-gray-600">Recent (7 days)</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.recent_shipments_7_days}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Transit</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {(stats.status_breakdown.in_transit || 0) + 
                     (stats.status_breakdown.out_for_delivery || 0)}
                  </p>
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
                  <p className="text-sm font-medium text-gray-600">Delivered</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.status_breakdown.delivered || 0}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Filters</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by tracking number or customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(statusConfig).map(([status, config]) => (
                    <SelectItem key={status} value={status}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipments List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Shipments ({pagination.total})
          </CardTitle>
          <CardDescription>
            Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shipments.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No shipments found</h3>
              <p className="text-gray-600">No shipments match your current filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {shipments.map((shipment) => (
                <div key={shipment.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Package className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {shipment.tracking_number}
                        </p>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>
                            Customer: {shipment.customer?.first_name} {shipment.customer?.last_name}
                            {shipment.customer?.company_name && ` (${shipment.customer.company_name})`}
                          </p>
                          <p>
                            Destination: {shipment.destination?.city_name}, {shipment.destination?.country_name}
                          </p>
                          <p>
                            {shipment.total_weight}lbs • {shipment.items_count} items • {formatCurrency(shipment.total_declared_value)}
                          </p>
                          <p>Created: {formatDate(shipment.created_at)}</p>
                          {shipment.latest_tracking && (
                            <p>Last update: {shipment.latest_tracking.location}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(shipment.status)}
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/shipments/${shipment.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Select
                          value={shipment.status}
                          onValueChange={(status) => handleUpdateStatus(shipment.id, status)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([status, config]) => (
                              <SelectItem key={status} value={status}>
                                {config.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <div className="flex items-center justify-between pt-6">
              <div className="text-sm text-gray-600">
                Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.offset === 0}
                  onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.has_more}
                  onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}