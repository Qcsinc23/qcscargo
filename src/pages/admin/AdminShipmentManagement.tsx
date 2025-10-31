import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
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
  RefreshCw,
  CheckSquare,
  Square
} from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog'
import { logger } from '@/lib/logger'
import { handleAdminError } from '@/lib/errorHandlers'

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
  const [selectedShipments, setSelectedShipments] = useState<Set<string>>(new Set())
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    has_more: false
  })
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    shipmentId: string
    currentStatus: string
    newStatus: string
  }>({
    open: false,
    shipmentId: '',
    currentStatus: '',
    newStatus: ''
  })
  const [updateLoading, setUpdateLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [statusFilter, pagination.offset])

  // Real-time subscription for shipment updates
  useEffect(() => {
    logger.debug('Setting up real-time subscription for shipments', {
      component: 'AdminShipmentManagement',
      action: 'setupRealtimeSubscription'
    })

    const subscription = supabase
      .channel('admin-shipment-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'shipments'
        },
        (payload) => {
          logger.debug('Real-time shipment update received', {
            component: 'AdminShipmentManagement',
            action: 'realtimeShipmentUpdate',
            eventType: payload.eventType,
            shipmentId: (payload.new || payload.old)?.id
          })

          // Refresh data when shipments change
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            logger.info('Shipment change detected, refreshing data', {
              component: 'AdminShipmentManagement',
              action: 'refreshAfterRealtimeUpdate'
            })
            // Debounce refresh to avoid too many calls
            setTimeout(() => {
              loadData()
            }, 500)
          }
        }
      )
      .subscribe()

    return () => {
      logger.debug('Cleaning up real-time subscription', {
        component: 'AdminShipmentManagement',
        action: 'cleanupRealtimeSubscription'
      })
      subscription.unsubscribe()
    }
  }, [statusFilter]) // Re-subscribe if filter changes

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
        const shipmentsList = shipmentsResponse.data.shipments || []
        // Debug logging
        logger.debug('Loaded shipments', {
          component: 'AdminShipmentManagement',
          action: 'loadData',
          count: shipmentsList.length,
          sample: shipmentsList[0] ? {
            id: shipmentsList[0].id,
            hasCustomer: !!shipmentsList[0].customer,
            hasDestination: !!shipmentsList[0].destination,
            customer: shipmentsList[0].customer,
            destination: shipmentsList[0].destination
          } : null
        })
        setShipments(shipmentsList)
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

  const handleStatusChangeRequest = (shipmentId: string, currentStatus: string, newStatus: string) => {
    if (currentStatus === newStatus) return
    
    setConfirmDialog({
      open: true,
      shipmentId,
      currentStatus,
      newStatus
    })
  }

  const handleUpdateStatus = async (shipmentId: string, newStatus: string, notes?: string) => {
    try {
      setUpdateLoading(true)
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

      const currentStatusLabel = statusConfig[confirmDialog.currentStatus as keyof typeof statusConfig]?.label || confirmDialog.currentStatus
      const newStatusLabel = statusConfig[newStatus as keyof typeof statusConfig]?.label || newStatus

      toast.success('Status Updated', {
        description: `Shipment status changed from "${currentStatusLabel}" to "${newStatusLabel}"`
      })
      
      setConfirmDialog({ open: false, shipmentId: '', currentStatus: '', newStatus: '' })
      await loadData()
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      logger.error('Error updating shipment status', error, {
        component: 'AdminShipmentManagement',
        action: 'handleUpdateStatus'
      })
      const errorMessage = handleAdminError(err, 'update status')
      toast.error('Failed to update status', {
        description: errorMessage
      })
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleSelectShipment = (shipmentId: string, checked: boolean) => {
    setSelectedShipments(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(shipmentId)
      } else {
        newSet.delete(shipmentId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedShipments.size === shipments.length) {
      setSelectedShipments(new Set())
    } else {
      setSelectedShipments(new Set(shipments.map(s => s.id)))
    }
  }

  const handleBulkStatusUpdate = (newStatus: string) => {
    if (selectedShipments.size === 0) {
      toast.error('Please select at least one shipment')
      return
    }

    setConfirmDialog({
      open: true,
      shipmentId: 'bulk',
      currentStatus: 'bulk',
      newStatus
    })
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                Shipments ({pagination.total})
              </CardTitle>
              <CardDescription>
                Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadData()}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            {selectedShipments.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{selectedShipments.size} selected</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusUpdate('in_transit')}
                >
                  Bulk Update Status
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedShipments(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </div>
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
              {/* Select All Checkbox */}
              <div className="flex items-center space-x-2 pb-2 border-b">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="flex items-center space-x-2"
                >
                  {selectedShipments.size === shipments.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  <span className="text-sm">
                    {selectedShipments.size === shipments.length ? 'Deselect All' : 'Select All'}
                  </span>
                </Button>
              </div>

              {shipments.map((shipment) => (
                <div key={shipment.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <Checkbox
                        checked={selectedShipments.has(shipment.id)}
                        onCheckedChange={(checked) => handleSelectShipment(shipment.id, checked as boolean)}
                      />
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Package className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {shipment.tracking_number}
                        </p>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>
                            Customer: {shipment.customer?.first_name || shipment.customer?.last_name || shipment.customer?.company_name 
                              ? `${shipment.customer.first_name || ''} ${shipment.customer.last_name || ''}${shipment.customer.company_name ? ` (${shipment.customer.company_name})` : ''}`.trim()
                              : 'N/A'}
                          </p>
                          <p>
                            Destination: {shipment.destination?.city_name || shipment.destination?.country_name
                              ? `${shipment.destination.city_name || ''}, ${shipment.destination.country_name || ''}`.replace(/^,\s*|,\s*$/g, '').trim()
                              : 'N/A'}
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
                          onClick={async () => {
                            try {
                              setLoading(true)
                              logger.debug('Loading shipment details', {
                                component: 'AdminShipmentManagement',
                                action: 'viewShipment',
                                shipmentId: shipment.id
                              })
                              
                              const { data, error } = await supabase.functions.invoke(
                                'admin-shipments-management',
                                {
                                  body: {
                                    action: 'get',
                                    shipment_id: shipment.id
                                  }
                                }
                              )
                              
                              if (error) {
                                logger.error('Edge function error', error as Error, {
                                  component: 'AdminShipmentManagement',
                                  action: 'viewShipment',
                                  shipmentId: shipment.id,
                                  errorDetails: error
                                })
                                throw error
                              }
                              
                              logger.debug('Shipment details loaded', {
                                component: 'AdminShipmentManagement',
                                action: 'viewShipment',
                                shipmentId: shipment.id,
                                hasData: !!data?.data?.shipment
                              })
                              
                              if (data?.data?.shipment) {
                                // Navigate to customer shipment details page
                                // The customer page should work for admins too
                                navigate(`/dashboard/shipments/${shipment.id}`)
                              } else {
                                throw new Error('Shipment not found in response')
                              }
                            } catch (err: unknown) {
                              const error = err instanceof Error ? err : new Error(String(err))
                              logger.error('Error loading shipment details', error, {
                                component: 'AdminShipmentManagement',
                                action: 'viewShipment',
                                shipmentId: shipment.id,
                                errorMessage: error.message
                              })
                              toast.error(`Failed to load shipment details: ${error.message}`)
                            } finally {
                              setLoading(false)
                            }
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Select
                          value={shipment.status}
                          onValueChange={(status) => handleStatusChangeRequest(shipment.id, shipment.status, status)}
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

      {/* Confirmation Dialog */}
      <ConfirmActionDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={
          confirmDialog.shipmentId === 'bulk'
            ? `Update ${selectedShipments.size} Shipments?`
            : 'Update Shipment Status?'
        }
        description={
          confirmDialog.shipmentId === 'bulk'
            ? `Are you sure you want to change the status of ${selectedShipments.size} shipment(s) to "${statusConfig[confirmDialog.newStatus as keyof typeof statusConfig]?.label || confirmDialog.newStatus}"?`
            : `Change status from "${statusConfig[confirmDialog.currentStatus as keyof typeof statusConfig]?.label || confirmDialog.currentStatus}" to "${statusConfig[confirmDialog.newStatus as keyof typeof statusConfig]?.label || confirmDialog.newStatus}"?`
        }
        confirmLabel="Update Status"
        cancelLabel="Cancel"
        variant="default"
        loading={updateLoading}
        onConfirm={async () => {
          if (confirmDialog.shipmentId === 'bulk') {
            // Handle bulk update using new API endpoint
            try {
              setUpdateLoading(true)
              const { data, error } = await supabase.functions.invoke(
                'admin-shipments-management',
                {
                  body: {
                    action: 'bulk_update_status',
                    shipment_ids: Array.from(selectedShipments),
                    status: confirmDialog.newStatus,
                    notes: `Bulk status update to ${statusConfig[confirmDialog.newStatus as keyof typeof statusConfig]?.label}`
                  }
                }
              )

              if (error) throw error

              const statusLabel = statusConfig[confirmDialog.newStatus as keyof typeof statusConfig]?.label || confirmDialog.newStatus
              toast.success('Bulk Update Complete', {
                description: `Updated ${data?.data?.updated_count || selectedShipments.size} shipment(s) to "${statusLabel}"`
              })
              
              setConfirmDialog({ open: false, shipmentId: '', currentStatus: '', newStatus: '' })
              setSelectedShipments(new Set())
              await loadData()
            } catch (err: unknown) {
              const error = err instanceof Error ? err : new Error(String(err))
              logger.error('Error with bulk status update', error, {
                component: 'AdminShipmentManagement',
                action: 'handleBulkStatusUpdate'
              })
              const errorMessage = handleAdminError(err, 'bulk update status')
              toast.error('Bulk update failed', {
                description: errorMessage
              })
            } finally {
              setUpdateLoading(false)
            }
          } else {
            handleUpdateStatus(confirmDialog.shipmentId, confirmDialog.newStatus)
          }
        }}
      />
    </div>
  )
}