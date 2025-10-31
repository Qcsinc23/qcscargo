import React, { useState } from 'react'
import { Search, Package, Plane, MapPin, Clock, AlertCircle, CheckCircle, Truck } from 'lucide-react'
import { MarketingLayout } from '@/components/layout/MarketingLayout'
import { featureFlags } from '@/lib/featureFlags'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'
import { Link } from 'react-router-dom'

export default function TrackingPage() {
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackingResult, setTrackingResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  // Legacy mock data - kept for reference but no longer used
  const _mockTrackingData = {
    'QCS123456': {
      trackingNumber: 'QCS123456',
      carrierTrackingNumber: 'CX789012345',
      status: 'In Transit',
      destination: 'Georgetown, Guyana',
      estimatedDelivery: '2025-01-08',
      weight: '25 lbs',
      service: 'Standard Air Freight',
      mailboxNumber: 'QCS105432',
      consolidated: true,
      timeline: [
        {
          status: 'Package Received',
          date: '2025-01-03',
          time: '10:30 AM',
          location: 'QCS Cargo Facility, Kearny NJ',
          description: 'Package received and inspected at our facility',
          completed: true
        },
        {
          status: 'Processing Complete',
          date: '2025-01-03',
          time: '4:15 PM',
          location: 'QCS Cargo Facility, Kearny NJ',
          description: 'Customs documentation prepared and package processed',
          completed: true
        },
        {
          status: 'Departed Facility',
          date: '2025-01-04',
          time: '8:00 AM',
          location: 'QCS Cargo Facility, Kearny NJ',
          description: 'Package dispatched to Newark Airport for air freight',
          completed: true
        },
        {
          status: 'In Transit',
          date: '2025-01-04',
          time: '6:30 PM',
          location: 'En route to Georgetown',
          description: 'Package loaded on air freight to Georgetown, Guyana',
          completed: true
        },
        {
          status: 'Customs Clearance',
          date: 'Expected 2025-01-07',
          time: 'TBD',
          location: 'Georgetown Airport, Guyana',
          description: 'Customs clearance processing in Guyana',
          completed: false
        },
        {
          status: 'Out for Delivery',
          date: 'Expected 2025-01-08',
          time: 'TBD',
          location: 'Georgetown, Guyana',
          description: 'Package out for local delivery',
          completed: false
        }
      ]
    },
    'QCS789012': {
      trackingNumber: 'QCS789012',
      carrierTrackingNumber: 'DX456789123',
      status: 'Delivered',
      destination: 'Kingston, Jamaica',
      estimatedDelivery: '2025-01-02',
      weight: '45 lbs',
      service: 'Express Air Freight',
      mailboxNumber: 'QCS103219',
      consolidated: false,
      timeline: [
        {
          status: 'Package Received',
          date: '2024-12-28',
          time: '2:00 PM',
          location: 'QCS Cargo Facility, Kearny NJ',
          description: 'Package received and inspected',
          completed: true
        },
        {
          status: 'Express Processing',
          date: '2024-12-28',
          time: '5:30 PM',
          location: 'QCS Cargo Facility, Kearny NJ',
          description: 'Express service - same day processing completed',
          completed: true
        },
        {
          status: 'Shipped',
          date: '2024-12-29',
          time: '7:00 AM',
          location: 'Newark Airport, NJ',
          description: 'Package shipped via express air freight',
          completed: true
        },
        {
          status: 'Arrived Destination',
          date: '2025-01-01',
          time: '11:30 AM',
          location: 'Kingston Airport, Jamaica',
          description: 'Package arrived at destination airport',
          completed: true
        },
        {
          status: 'Customs Cleared',
          date: '2025-01-01',
          time: '3:45 PM',
          location: 'Kingston Airport, Jamaica',
          description: 'Customs clearance completed',
          completed: true
        },
        {
          status: 'Delivered',
          date: '2025-01-02',
          time: '10:15 AM',
          location: 'Kingston, Jamaica',
          description: 'Package successfully delivered to recipient',
          completed: true
        }
      ]
    }
  }

  const handleTracking = async () => {
    if (!trackingNumber.trim()) {
      setError('Please enter a tracking number')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Query shipment by tracking number
      const { data: shipments, error: queryError } = await supabase
        .from('shipments')
        .select('*')
        .eq('tracking_number', trackingNumber.toUpperCase().trim())
        .maybeSingle()

      if (queryError) {
        throw queryError
      }

      if (!shipments) {
        setError('Tracking number not found. Please check the number and try again.')
        setTrackingResult(null)
        setLoading(false)
        return
      }

      // If user is logged in and it's their shipment, get full details
      if (user && shipments.customer_id === user.id) {
        try {
          const { data: shipmentData, error: shipmentError } = await supabase.functions.invoke('shipment-management', {
            body: {
              action: 'get',
              shipment_id: shipments.id.toString()
            }
          })

          if (!shipmentError && shipmentData?.data) {
            const fullShipment = shipmentData.data.shipment
            const trackingHistory = shipmentData.data.tracking || []
            const items = shipmentData.data.items || []

            // Format for display
            setTrackingResult({
              trackingNumber: fullShipment.tracking_number,
              carrierTrackingNumber: fullShipment.carrier_tracking_number || 'Pending',
              status: fullShipment.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
              destination: fullShipment.destinations ? 
                `${fullShipment.destinations.city_name}, ${fullShipment.destinations.country_name}` : 
                'Unknown',
              estimatedDelivery: fullShipment.delivered_at || 
                (fullShipment.shipped_at ? 
                  new Date(new Date(fullShipment.shipped_at).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : 
                  'TBD'),
              weight: `${fullShipment.total_weight || 0} lbs`,
              service: fullShipment.service_type === 'express' ? 'Express Air Freight' : 'Standard Air Freight',
              timeline: trackingHistory.map((track: any) => ({
                status: track.status || track.location,
                date: new Date(track.timestamp).toLocaleDateString(),
                time: new Date(track.timestamp).toLocaleTimeString(),
                location: track.location || 'QCS Cargo Facility',
                description: track.notes || track.status,
                completed: new Date(track.timestamp) < new Date()
              })),
              shipment: fullShipment,
              items
            })
            setLoading(false)
            return
          }
        } catch (err) {
          logger.error('Error fetching full shipment details', err instanceof Error ? err : new Error(String(err)), {
            component: 'TrackingPage',
            action: 'handleTracking'
          })
        }
      }

      // For non-logged-in users or if fetch fails, show basic info
      const { data: trackingData } = await supabase
        .from('shipment_tracking')
        .select('*')
        .eq('shipment_id', shipments.id)
        .eq('is_customer_visible', true)
        .order('timestamp', { ascending: false })
        .limit(10)

      const trackingHistory = trackingData || []

      // Get destination info
      let destinationName = 'Unknown'
      if (shipments.destination_id) {
        const { data: dest } = await supabase
          .from('destinations')
          .select('city_name, country_name')
          .eq('id', shipments.destination_id)
          .maybeSingle()
        
        if (dest) {
          destinationName = `${dest.city_name}, ${dest.country_name}`
        }
      }

      setTrackingResult({
        trackingNumber: shipments.tracking_number,
        carrierTrackingNumber: shipments.carrier_tracking_number || 'Pending',
        status: shipments.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        destination: destinationName,
        estimatedDelivery: shipments.delivered_at || 
          (shipments.shipped_at ? 
            new Date(new Date(shipments.shipped_at).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : 
            'TBD'),
        weight: `${shipments.total_weight || 0} lbs`,
        service: shipments.service_type === 'express' ? 'Express Air Freight' : 'Standard Air Freight',
        timeline: trackingHistory.map((track: any) => ({
          status: track.status || track.location,
          date: new Date(track.timestamp).toLocaleDateString(),
          time: new Date(track.timestamp).toLocaleTimeString(),
          location: track.location || 'QCS Cargo Facility',
          description: track.notes || track.status,
          completed: new Date(track.timestamp) < new Date()
        })),
        shipment: shipments
      })

    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      logger.error('Error tracking shipment', error, {
        component: 'TrackingPage',
        action: 'handleTracking'
      })
      setError('Failed to track shipment. Please try again or contact support.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string, completed: boolean) => {
    if (!completed) return <Clock className="h-5 w-5 text-slate-400" />
    
    switch (status.toLowerCase()) {
      case 'package received':
        return <Package className="h-5 w-5 text-indigo-700" />
      case 'processing complete':
      case 'express processing':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'departed facility':
      case 'shipped':
        return <Truck className="h-5 w-5 text-indigo-700" />
      case 'in transit':
      case 'arrived destination':
        return <Plane className="h-5 w-5 text-indigo-700" />
      case 'customs clearance':
      case 'customs cleared':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'out for delivery':
        return <Truck className="h-5 w-5 text-yellow-600" />
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      default:
        return <Package className="h-5 w-5 text-slate-600" />
    }
  }

  const pageSeo = {
    title: 'Track Your Shipment | QCS Cargo Tracking',
    description: 'Enter your QCS Cargo tracking number to see the latest updates on your Caribbean shipment.',
    canonicalPath: '/tracking'
  }

  return (
    <MarketingLayout seo={pageSeo}>
      <div className="bg-slate-50 min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="bg-indigo-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              Track Your Shipment
            </h1>
            <p className="text-xl text-slate-600">
              Enter your QCS Cargo tracking number to check the status of your Caribbean shipment
            </p>
          </div>

          {/* Tracking Form */}
          <div className="bg-white p-8 rounded-xl shadow-lg mb-8">
            <div className="max-w-2xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                  placeholder="Enter tracking number (e.g., QCS123456)"
                  className="flex-1 p-4 border border-slate-300 rounded-lg text-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                  onKeyPress={(e) => e.key === 'Enter' && handleTracking()}
                />
                <button
                  onClick={handleTracking}
                  disabled={loading}
                  className="bg-indigo-700 text-white px-8 py-4 rounded-lg font-semibold hover:bg-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>Track <Search className="ml-2 h-5 w-5" /></>
                  )}
                </button>
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-sm text-slate-500">
                  Demo tracking numbers: <span className="font-mono text-indigo-700">QCS123456</span> (In Transit) or <span className="font-mono text-indigo-700">QCS789012</span> (Delivered)
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {/* Tracking Results */}
          {trackingResult && (
            <div className="space-y-8">
              {/* Shipment Summary */}
              <div className="bg-white p-8 rounded-xl shadow-lg">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Shipment Details</h2>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tracking Number:</span>
                        <span className="font-semibold font-mono">{trackingResult.trackingNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Carrier Reference:</span>
                        <span className="font-semibold font-mono">{trackingResult.carrierTrackingNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Service:</span>
                        <span className="font-semibold">{trackingResult.service}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Weight:</span>
                        <span className="font-semibold">{trackingResult.weight}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Destination:</span>
                        <span className="font-semibold">{trackingResult.destination}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Current Status</h2>
                    <div className="bg-indigo-50 p-6 rounded-lg border-l-4 border-indigo-700">
                      <div className="flex items-center mb-2">
                        <MapPin className="h-6 w-6 text-indigo-700 mr-2" />
                        <span className="text-2xl font-bold text-indigo-900">{trackingResult.status}</span>
                      </div>
                      <p className="text-slate-700 mb-3">
                        Expected delivery: <span className="font-semibold">{trackingResult.estimatedDelivery}</span>
                      </p>
                      {trackingResult.status === 'Delivered' && (
                        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium inline-block">
                          Package delivered successfully
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {featureFlags.virtualMailboxUi && trackingResult.shipment?.customer_id && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      {user && trackingResult.shipment.customer_id === user.id ? (
                        <>
                          View full shipment details in your{' '}
                          <Link to={`/dashboard/shipments/${trackingResult.shipment.id}`} className="font-semibold underline">
                            dashboard
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link to="/auth/login" className="font-semibold underline">
                            Sign in
                          </Link>
                          {' '}to view full shipment details and manage documents
                        </>
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Tracking Timeline */}
              <div className="bg-white p-8 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-slate-900 mb-8">Tracking Timeline</h2>
                
                <div className="relative">
                  {trackingResult.timeline.map((event: any, index: number) => (
                    <div key={index} className="flex items-start pb-8 last:pb-0">
                      {/* Timeline connector */}
                      {index < trackingResult.timeline.length - 1 && (
                        <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200"></div>
                      )}
                      
                      {/* Status icon */}
                      <div className={`bg-white border-2 w-12 h-12 rounded-full flex items-center justify-center mr-4 relative z-10 ${
                        event.completed ? 'border-indigo-700 bg-indigo-50' : 'border-slate-300 bg-slate-50'
                      }`}>
                        {getStatusIcon(event.status, event.completed)}
                      </div>
                      
                      {/* Event details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <h3 className={`text-lg font-semibold ${
                            event.completed ? 'text-slate-900' : 'text-slate-500'
                          }`}>
                            {event.status}
                          </h3>
                          <div className={`text-sm font-medium ${
                            event.completed ? 'text-indigo-700' : 'text-slate-500'
                          }`}>
                            {event.date} {event.time !== 'TBD' && `at ${event.time}`}
                          </div>
                        </div>
                        
                        <p className={`text-sm mt-1 ${
                          event.completed ? 'text-slate-600' : 'text-slate-400'
                        }`}>
                          {event.location}
                        </p>
                        
                        <p className={`text-sm mt-1 ${
                          event.completed ? 'text-slate-700' : 'text-slate-400'
                        }`}>
                          {event.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Help Section */}
          <div className="mt-12 bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-semibold text-center mb-6">Need Help with Tracking?</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Package className="h-6 w-6 text-indigo-700" />
                </div>
                <h3 className="font-semibold mb-2">Can't Find Your Number?</h3>
                <p className="text-sm text-slate-600">
                  Your tracking number is provided when you ship with QCS Cargo. Check your receipt or confirmation email.
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">Tracking Updates</h3>
                <p className="text-sm text-slate-600">
                  Updates may take 12-24 hours to appear. Contact us if your shipment hasn't updated in 48 hours.
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">Delivery Issues</h3>
                <p className="text-sm text-slate-600">
                  If you experience delivery delays or issues, our team is here to help resolve them quickly.
                </p>
              </div>
            </div>
            
            <div className="text-center mt-8">
              <p className="text-slate-600 mb-4">Still need assistance? Our team is here to help.</p>
              <div className="space-x-4">
                <a
                  href="tel:201-249-0929"
                  className="bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-800 transition-colors inline-block"
                >
                  Call 201-249-0929
                </a>
                <a
                  href="mailto:sales@quietcraftsolutions.com"
                  className="border border-indigo-700 text-indigo-700 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors inline-block"
                >
                  Email Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </MarketingLayout>
  )
}
