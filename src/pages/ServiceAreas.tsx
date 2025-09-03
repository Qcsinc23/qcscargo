import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapPin, Plane, Clock, DollarSign, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Destination } from '@/lib/types'

export default function ServiceAreas() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null)

  useEffect(() => {
    loadDestinations()
  }, [])

  const loadDestinations = async () => {
    try {
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .eq('is_active', true)
        .order('country_name')

      if (error) throw error
      setDestinations(data || [])
    } catch (error) {
      console.error('Error loading destinations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateShipment = (destination: Destination) => {
    const destinationParam = `destination_id=${destination.id}&country=${encodeURIComponent(destination.country_name)}`
    
    if (!user) {
      // User not logged in - redirect to login with return URL to dashboard create shipment page
      const returnUrl = encodeURIComponent(`/dashboard/create-shipment?${destinationParam}`)
      navigate(`/auth/login?returnUrl=${returnUrl}`)
    } else {
      // User is logged in - navigate directly to create shipment page
      navigate(`/dashboard/create-shipment?${destinationParam}`)
    }
  }

  const destinationFeatures = {
    'Guyana': {
      description: 'Our primary destination with the fastest service and best rates. Serving the large Guyanese diaspora community in New Jersey.',
      specialties: ['Electronics and appliances', 'Household goods', 'Food items', 'Medical supplies'],
      customsInfo: 'Familiar with Guyanese customs requirements. Expedited clearance available.',
      localPartners: 'Established delivery network in Georgetown and surrounding areas.'
    },
    'Jamaica': {
      description: 'Regular service to Kingston and Montego Bay with reliable transit times and competitive rates.',
      specialties: ['Personal effects', 'Business cargo', 'Automotive parts', 'Cultural items'],
      customsInfo: 'Experienced with Jamaican customs procedures and documentation requirements.',
      localPartners: 'Delivery partners in Kingston, Spanish Town, and major cities.'
    },
    'Trinidad and Tobago': {
      description: 'Professional air cargo service to Port of Spain and San Fernando with trusted local partnerships.',
      specialties: ['Industrial equipment', 'Food products', 'Electronics', 'Educational materials'],
      customsInfo: 'Knowledge of Trinidad customs regulations and tax requirements.',
      localPartners: 'Reliable delivery network throughout Trinidad and Tobago.'
    },
    'Barbados': {
      description: 'Quality service to Bridgetown with careful handling for this important Caribbean destination.',
      specialties: ['Tourism supplies', 'Personal shipments', 'Business equipment', 'Medical items'],
      customsInfo: 'Understanding of Barbadian import regulations and procedures.',
      localPartners: 'Trusted partners for island-wide delivery services.'
    },
    'Suriname': {
      description: 'Serving the Surinamese community with competitive rates and reliable transit times to Paramaribo.',
      specialties: ['Consumer goods', 'Electronics', 'Food items', 'Personal effects'],
      customsInfo: 'Familiar with Surinamese customs requirements and Dutch documentation.',
      localPartners: 'Local partners for delivery throughout Suriname.'
    }
  }

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-900 to-blue-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Caribbean Service Areas
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Professional air cargo service to major Caribbean destinations. 
            Fast, reliable, and cost-effective shipping from New Jersey.
          </p>
        </div>
      </section>

      {/* Destinations Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Destinations We Serve
            </h2>
            <p className="text-xl text-gray-600">
              Click on any destination for detailed information about rates, transit times, and services
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading destinations...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {destinations.map((destination) => (
                <div 
                  key={destination.id}
                  className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => setSelectedDestination(destination)}
                >
                  <div className="flex items-center mb-4">
                    <div className="bg-blue-100 p-3 rounded-full mr-4">
                      <MapPin className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{destination.country_name}</h3>
                      <p className="text-gray-600">{destination.city_name}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        Transit Time:
                      </span>
                      <span className="font-medium text-blue-600">
                        {destination.transit_days_min}-{destination.transit_days_max} days
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="flex items-center text-gray-600">
                        <DollarSign className="h-4 w-4 mr-2" />
                        From:
                      </span>
                      <span className="font-bold text-green-600 text-lg">
                        ${destination.rate_per_lb_201_plus.toFixed(2)}/lb
                      </span>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-200">
                      <span className="text-sm text-gray-500">Airport: {destination.airport_code}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Destination Details Modal/Section */}
      {selectedDestination && (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-4 rounded-full mr-6">
                      <Plane className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">{selectedDestination.country_name}</h2>
                      <p className="text-xl text-gray-600">{selectedDestination.city_name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDestination(null)}
                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Rates Table */}
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Shipping Rates</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2">Weight Range</th>
                            <th className="text-right py-2">Rate per lb</th>
                          </tr>
                        </thead>
                        <tbody className="space-y-2">
                          <tr>
                            <td className="py-1">1-50 lbs</td>
                            <td className="text-right font-medium">${selectedDestination.rate_per_lb_1_50.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td className="py-1">51-100 lbs</td>
                            <td className="text-right font-medium">${selectedDestination.rate_per_lb_51_100.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td className="py-1">101-200 lbs</td>
                            <td className="text-right font-medium">${selectedDestination.rate_per_lb_101_200.toFixed(2)}</td>
                          </tr>
                          <tr className="border-t border-gray-200">
                            <td className="py-1 font-semibold">201+ lbs</td>
                            <td className="text-right font-bold text-green-600">${selectedDestination.rate_per_lb_201_plus.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <p className="text-sm text-gray-500 mt-3">
                        Express service: +{selectedDestination.express_surcharge_percent}% surcharge
                      </p>
                    </div>
                  </div>

                  {/* Transit & Service Info */}
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Service Information</h3>
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center mb-2">
                          <Clock className="h-5 w-5 text-blue-600 mr-2" />
                          <span className="font-medium">Transit Time</span>
                        </div>
                        <p className="text-gray-700">
                          Standard: {selectedDestination.transit_days_min}-{selectedDestination.transit_days_max} business days<br />
                          Express: {Math.max(1, selectedDestination.transit_days_min - 1)}-{Math.max(2, selectedDestination.transit_days_max - 1)} business days
                        </p>
                      </div>
                      
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center mb-2">
                          <Info className="h-5 w-5 text-green-600 mr-2" />
                          <span className="font-medium">Airport Code</span>
                        </div>
                        <p className="text-gray-700">{selectedDestination.airport_code}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Information */}
                {destinationFeatures[selectedDestination.country_name as keyof typeof destinationFeatures] && (
                  <div className="mt-8 border-t border-gray-200 pt-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div>
                        <h3 className="text-xl font-semibold mb-4">Overview</h3>
                        <p className="text-gray-700 mb-4">
                          {destinationFeatures[selectedDestination.country_name as keyof typeof destinationFeatures].description}
                        </p>
                        
                        <h4 className="font-semibold mb-2">Common Shipments:</h4>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                          {destinationFeatures[selectedDestination.country_name as keyof typeof destinationFeatures].specialties.map((specialty, index) => (
                            <li key={index}>{specialty}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="text-xl font-semibold mb-4">Local Services</h3>
                        
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2">Customs Expertise:</h4>
                            <p className="text-gray-700 text-sm">
                              {destinationFeatures[selectedDestination.country_name as keyof typeof destinationFeatures].customsInfo}
                            </p>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-2">Local Partners:</h4>
                            <p className="text-gray-700 text-sm">
                              {destinationFeatures[selectedDestination.country_name as keyof typeof destinationFeatures].localPartners}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-8 border-t border-gray-200 pt-6 text-center">
                  <button 
                    onClick={() => handleCreateShipment(selectedDestination)}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors mr-4 inline-block"
                  >
                    Create a Shipment to {selectedDestination.country_name}
                  </button>
                  <Link 
                    to={`/shipping-calculator?destination=${selectedDestination.id}&country=${encodeURIComponent(selectedDestination.country_name)}`}
                    className="border border-blue-600 text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors inline-block"
                  >
                    Calculate Shipping Cost
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Additional Services */}
      <section className="py-16 bg-blue-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Additional Destination Services
            </h2>
            <p className="text-xl text-gray-600">
              Beyond our primary destinations, we offer services to other Caribbean islands
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <h3 className="text-xl font-semibold mb-3">Other Caribbean Islands</h3>
              <p className="text-gray-600 mb-4">
                St. Lucia, Grenada, St. Vincent, Dominica, and other CARICOM destinations available on request.
              </p>
              <p className="text-sm text-blue-600 font-medium">Custom quotes available</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <h3 className="text-xl font-semibold mb-3">Special Routing</h3>
              <p className="text-gray-600 mb-4">
                Multi-destination shipping and special routing arrangements for unique shipping needs.
              </p>
              <p className="text-sm text-blue-600 font-medium">Contact for details</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <h3 className="text-xl font-semibold mb-3">Express Services</h3>
              <p className="text-gray-600 mb-4">
                Priority handling and expedited customs clearance for urgent shipments to any destination.
              </p>
              <p className="text-sm text-blue-600 font-medium">Available for all destinations</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}