import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Package,
  MapPin,
  Clock,
  Truck,
  Plane,
  CheckCircle,
  AlertCircle,
  FileText,
  Download,
  Upload,
  Calendar,
  DollarSign,
  Weight,
  User,
  Search
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
// import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation'

interface ShipmentItem {
  id: number
  shipment_id: number
  description: string
  weight: number
  quantity: number
  length?: number
  width?: number
  height?: number
  value?: number
  category: string
  notes?: string
}

interface TrackingEvent {
  id: number
  shipment_id: number
  status: string
  location: string
  notes?: string
  timestamp: string
  is_customer_visible: boolean
}

interface ShipmentDocument {
  id: number
  shipment_id: number
  document_type: string
  document_name: string
  file_url: string
  file_size: number
  mime_type: string
  status: string
  upload_date: string
}

interface ShipmentDetails {
  id: number
  tracking_number: string
  customer_id: string
  destination_id: number
  service_type: 'standard' | 'express'
  status: string
  total_weight: number
  total_declared_value: number
  pickup_scheduled_at?: string
  processed_at?: string
  shipped_at?: string
  delivered_at?: string
  carrier_name?: string
  carrier_tracking_number?: string
  customs_cleared_at?: string
  delivery_notes?: string
  special_instructions?: string
  created_at: string
  updated_at: string
  destinations?: {
    city_name: string
    country_name: string
  }
  items?: ShipmentItem[]
  tracking?: TrackingEvent[]
  documents?: ShipmentDocument[]
}

export default function ShipmentDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [shipment, setShipment] = useState<ShipmentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadShipmentDetails()
    }
  }, [id])

  const loadShipmentDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      // Try admin endpoint first (for admin users), fallback to customer endpoint
      let functionError = null
      let data = null
      
      try {
        const adminResult = await supabase.functions.invoke('admin-shipments-management', {
          body: {
            action: 'get',
            shipment_id: id
          }
        })
        
        if (!adminResult.error && adminResult.data?.data?.shipment) {
          data = adminResult.data
          logger.debug('Loaded shipment via admin endpoint', {
            component: 'ShipmentDetailsPage',
            action: 'loadShipmentDetails',
            shipmentId: id
          })
        } else {
          throw adminResult.error || new Error('Admin endpoint failed')
        }
      } catch (adminErr) {
        // Fallback to customer endpoint
        logger.debug('Falling back to customer endpoint', {
          component: 'ShipmentDetailsPage',
          action: 'loadShipmentDetails',
          shipmentId: id,
          adminError: adminErr instanceof Error ? adminErr.message : String(adminErr)
        })
        
        const customerResult = await supabase.functions.invoke('shipment-management', {
          body: {
            action: 'get',
            shipment_id: id
          }
        })
        
        if (customerResult.error) {
          functionError = customerResult.error
        } else {
          data = customerResult.data
        }
      }

      if (functionError) {
        throw new Error(functionError.message)
      }

      if (data?.error) {
        throw new Error(data.error.message)
      }

      if (data?.data?.shipment) {
        const shipmentData = data.data.shipment
        logger.debug('Shipment data received', {
          component: 'ShipmentDetailsPage',
          action: 'loadShipmentDetails',
          shipmentId: id,
          hasTracking: !!shipmentData.tracking_number,
          hasItems: !!shipmentData.items,
          hasTrackingHistory: !!shipmentData.tracking,
          shipmentKeys: Object.keys(shipmentData)
        })
        
        // Ensure required fields exist with defaults
        // Handle both admin endpoint (destination) and customer endpoint (destinations) formats
        const normalizedShipment = {
          ...shipmentData,
          tracking_number: shipmentData.tracking_number || `SHIP-${id}`,
          status: shipmentData.status || 'pending_pickup',
          total_weight: shipmentData.total_weight || 0,
          total_declared_value: shipmentData.total_declared_value || 0,
          items: shipmentData.items || [],
          tracking: shipmentData.tracking || [],
          // Normalize destination/destinations - admin uses 'destination', customer uses 'destinations'
          destinations: shipmentData.destinations || shipmentData.destination || null
        }
        
        logger.debug('Normalized shipment data', {
          component: 'ShipmentDetailsPage',
          action: 'loadShipmentDetails',
          shipmentId: id,
          hasDestinations: !!normalizedShipment.destinations,
          normalizedKeys: Object.keys(normalizedShipment)
        })
        
        setShipment(normalizedShipment)
      } else {
        logger.error('Shipment not found in response', new Error('Shipment not found'), {
          component: 'ShipmentDetailsPage',
          action: 'loadShipmentDetails',
          shipmentId: id,
          responseData: data
        })
        throw new Error('Shipment not found')
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      logger.error('Error loading shipment details', error, {
        component: 'ShipmentDetailsPage',
        action: 'loadShipmentDetails'
      })
      setError(error.message || 'Failed to load shipment details')
      toast.error('Failed to load shipment details')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
      pending_pickup: { label: 'Pending Pickup', variant: 'outline', className: 'border-amber-300 text-amber-700 bg-amber-50' },
      picked_up: { label: 'Picked Up', variant: 'default', className: 'border-blue-300 text-blue-700 bg-blue-50' },
      processing: { label: 'Processing', variant: 'default', className: 'border-indigo-300 text-indigo-700 bg-indigo-50' },
      in_transit: { label: 'In Transit', variant: 'default', className: 'border-purple-300 text-purple-700 bg-purple-50' },
      customs_clearance: { label: 'Customs Clearance', variant: 'outline', className: 'border-yellow-300 text-yellow-700 bg-yellow-50' },
      out_for_delivery: { label: 'Out for Delivery', variant: 'default', className: 'border-green-300 text-green-700 bg-green-50' },
      delivered: { label: 'Delivered', variant: 'default', className: 'border-emerald-300 text-emerald-700 bg-emerald-50' },
      cancelled: { label: 'Cancelled', variant: 'destructive', className: 'border-red-300 text-red-700 bg-red-50' }
    }

    const config = statusConfig[status] || { label: status, variant: 'outline' as const, className: '' }
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getStatusIcon = (status: string) => {
    if (status.toLowerCase().includes('delivered') || status.toLowerCase().includes('complete')) {
      return <CheckCircle className="h-5 w-5 text-green-600" />
    }
    if (status.toLowerCase().includes('transit')) {
      return <Plane className="h-5 w-5 text-blue-600" />
    }
    if (status.toLowerCase().includes('pickup') || status.toLowerCase().includes('delivery')) {
      return <Truck className="h-5 w-5 text-indigo-600" />
    }
    return <Package className="h-5 w-5 text-slate-600" />
  }

  if (loading) {
    return (
      <AuthLayout showTabs>
        <div className="min-h-screen bg-white p-6">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="h-64 bg-gray-200 rounded mb-6"></div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </AuthLayout>
    )
  }

  if (error || !shipment) {
    return (
      <AuthLayout showTabs>
        <div className="min-h-screen bg-white p-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Shipment Not Found</h1>
              <p className="text-gray-600 mb-6">{error || 'The shipment you are looking for does not exist or you do not have permission to view it.'}</p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => navigate('/dashboard')} variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
                <Link to="/tracking">
                  <Button>
                    <Search className="h-4 w-4 mr-2" />
                    Track Another Shipment
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout showTabs>
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
            <Link to="/dashboard" className="hover:text-slate-900">Dashboard</Link>
            <span>/</span>
            <Link to="/dashboard" className="hover:text-slate-900">Shipments</Link>
            <span>/</span>
            <span className="text-slate-900 font-mono">{shipment?.tracking_number || 'Loading...'}</span>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-6 mt-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Shipment Details</h1>
                <p className="text-sm text-slate-600 mt-1 font-mono">{shipment?.tracking_number || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {shipment?.status && getStatusBadge(shipment.status)}
              {shipment?.carrier_tracking_number && (
                <Badge variant="outline" className="font-mono">
                  Carrier: {shipment.carrier_tracking_number}
                </Badge>
              )}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipment Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Shipment Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-slate-600 mb-1">Destination</div>
                      <div className="font-semibold text-slate-900">
                        {shipment?.destinations ? 
                          `${shipment.destinations.city_name || ''}, ${shipment.destinations.country_name || ''}`.replace(/^,\s*|,\s*$/g, '').trim() || 'Unknown' : 
                          'Unknown'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600 mb-1">Service Type</div>
                      <div className="font-semibold text-slate-900 capitalize">
                        {shipment?.service_type || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600 mb-1">Total Weight</div>
                      <div className="font-semibold text-slate-900">
                        {shipment?.total_weight || 0} lbs
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600 mb-1">Declared Value</div>
                      <div className="font-semibold text-slate-900">
                        {formatCurrency(shipment?.total_declared_value)}
                      </div>
                    </div>
                  </div>

                  {shipment?.special_instructions && (
                    <>
                      <Separator />
                      <div>
                        <div className="text-sm text-slate-600 mb-1">Special Instructions</div>
                        <div className="text-slate-900">{shipment.special_instructions}</div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Items */}
              {shipment?.items && shipment.items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Items ({shipment.items.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {shipment.items.map((item) => (
                        <div key={item.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-semibold text-slate-900">{item.description}</div>
                            <Badge variant="outline">{item.category}</Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600 mt-2">
                            <div>
                              <span className="font-medium">Quantity:</span> {item.quantity}
                            </div>
                            <div>
                              <span className="font-medium">Weight:</span> {item.weight} lbs
                            </div>
                            {item.value && (
                              <div>
                                <span className="font-medium">Value:</span> {formatCurrency(item.value)}
                              </div>
                            )}
                            {(item.length || item.width || item.height) && (
                              <div>
                                <span className="font-medium">Dimensions:</span>{' '}
                                {item.length ? `${item.length}"` : ''}
                                {item.length && item.width ? ' × ' : ''}
                                {item.width ? `${item.width}"` : ''}
                                {item.width && item.height ? ' × ' : ''}
                                {item.height ? `${item.height}"` : ''}
                              </div>
                            )}
                          </div>
                          {item.notes && (
                            <div className="text-sm text-slate-500 mt-2 italic">Note: {item.notes}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tracking Timeline */}
              {shipment?.tracking && shipment.tracking.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tracking Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      {shipment.tracking.map((event, index) => (
                        <div key={event.id} className="flex items-start pb-6 last:pb-0 relative">
                          {index < shipment.tracking!.length - 1 && (
                            <div className="absolute left-6 top-12 w-0.5 h-full bg-gray-200"></div>
                          )}
                          <div className={`bg-white border-2 w-12 h-12 rounded-full flex items-center justify-center mr-4 relative z-10 ${
                            new Date(event.timestamp) < new Date() ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'
                          }`}>
                            {getStatusIcon(event.status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1">
                              <h3 className={`text-base font-semibold ${
                                new Date(event.timestamp) < new Date() ? 'text-slate-900' : 'text-slate-500'
                              }`}>
                                {event.status}
                              </h3>
                              <div className={`text-sm ${
                                new Date(event.timestamp) < new Date() ? 'text-slate-700' : 'text-slate-500'
                              }`}>
                                {formatDateTime(event.timestamp)}
                              </div>
                            </div>
                            <p className="text-sm text-slate-600 mb-1">
                              <MapPin className="h-3 w-3 inline mr-1" />
                              {event.location}
                            </p>
                            {event.notes && (
                              <p className="text-sm text-slate-500 mt-1">{event.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Documents */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Documents</CardTitle>
                    <Button size="sm" variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Document
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {shipment?.documents && shipment.documents.length > 0 ? (
                    <div className="space-y-3">
                      {shipment.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between border rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-slate-600" />
                            <div>
                              <div className="font-medium text-slate-900">{doc.document_name}</div>
                              <div className="text-xs text-slate-500">
                                {doc.document_type} • {new Date(doc.upload_date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {doc.status}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(doc.file_url, '_blank')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <p>No documents uploaded yet</p>
                      <Button size="sm" variant="outline" className="mt-3">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload First Document
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Timeline & Quick Info */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link to={`/tracking?number=${shipment?.tracking_number || ''}`}>
                    <Button variant="outline" className="w-full justify-start">
                      <Search className="h-4 w-4 mr-2" />
                      Track Shipment
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Download Label
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Documents
                  </Button>
                </CardContent>
              </Card>

              {/* Key Dates */}
              <Card>
                <CardHeader>
                  <CardTitle>Key Dates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Created</div>
                    <div className="text-sm font-medium text-slate-900">
                      {formatDateTime(shipment.created_at)}
                    </div>
                  </div>
                  {shipment.pickup_scheduled_at && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Pickup Scheduled</div>
                      <div className="text-sm font-medium text-slate-900">
                        {formatDateTime(shipment.pickup_scheduled_at)}
                      </div>
                    </div>
                  )}
                  {shipment.processed_at && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Processed</div>
                      <div className="text-sm font-medium text-slate-900">
                        {formatDateTime(shipment.processed_at)}
                      </div>
                    </div>
                  )}
                  {shipment.shipped_at && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Shipped</div>
                      <div className="text-sm font-medium text-slate-900">
                        {formatDateTime(shipment.shipped_at)}
                      </div>
                    </div>
                  )}
                  {shipment.customs_cleared_at && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Customs Cleared</div>
                      <div className="text-sm font-medium text-slate-900">
                        {formatDateTime(shipment.customs_cleared_at)}
                      </div>
                    </div>
                  )}
                  {shipment.delivered_at && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Delivered</div>
                      <div className="text-sm font-medium text-green-700">
                        {formatDateTime(shipment.delivered_at)}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Delivery Info */}
              {shipment.delivery_notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Delivery Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-700">{shipment.delivery_notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}

