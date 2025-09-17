import React, { useState, useEffect } from 'react'
import { DollarSign, Info, Package, Plane, Shield, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Destination } from '@/lib/types'
import { MarketingLayout } from '@/components/layout/MarketingLayout'

export default function RatesPage() {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('rates')

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

  const additionalServices = [
    { service: 'Consolidation Service', price: '$5.00 per additional shipment', description: 'Combine multiple packages into one shipment' },
    { service: 'Pickup Service', price: '$25.00 (within 25 miles)', description: 'Convenient pickup from your location' },
    { service: 'Express Processing', price: '$15.00', description: 'Same-day processing and priority handling' },
    { service: 'Oversized Item Handling', price: '$20.00', description: 'Special handling for items over 70 lbs or unusual dimensions' },
    { service: 'Custom Packaging', price: '$10.00 - $75.00', description: 'Professional packaging for fragile or valuable items' },
    { service: 'Extended Storage', price: '$0.75/lb/week', description: 'Storage beyond the 7-day free period' },
    { service: 'Rush Documentation', price: '$20.00', description: 'Expedited customs documentation processing' }
  ]

  const insuranceRates = [
    { coverage: 'Basic Coverage', price: 'FREE', description: 'Up to $100 declared value included' },
    { coverage: 'Standard Insurance', price: '$7.50 per $100', description: 'Additional coverage (minimum $15.00)' },
    { coverage: 'High-Value Items', price: 'Custom Quote', description: 'For items over $2,500 declared value' }
  ]

  const volumeDiscounts = [
    { range: '100-250 lbs/month', discount: '5%', description: 'Regular customer discount' },
    { range: '251-500 lbs/month', discount: '10%', description: 'Frequent shipper discount' },
    { range: '501-1000 lbs/month', discount: '15%', description: 'High volume discount' },
    { range: '1000+ lbs/month', discount: 'Custom', description: 'Enterprise pricing available' }
  ]

  const rateExamples = [
    {
      title: 'Small Personal Package',
      details: '5 lbs to Georgetown, Guyana',
      calculation: [
        'Base rate: 5 lbs ?? $4.50 = $22.50',
        'Insurance (optional): $200 value = $15.00',
        'Total: $37.50'
      ],
      total: '$37.50'
    },
    {
      title: 'Medium Consolidated Shipment',
      details: '35 lbs to Kingston, Jamaica (2 packages)',
      calculation: [
        'Base rate: 35 lbs ?? $4.75 = $166.25',
        'Consolidation: 1 additional package = $5.00',
        'Total: $171.25'
      ],
      total: '$171.25'
    },
    {
      title: 'Large Business Shipment',
      details: '150 lbs to Port of Spain, Trinidad',
      calculation: [
        'Base rate: 150 lbs ?? $4.25 = $637.50',
        'Business discount (10%): -$63.75',
        'Express processing: $15.00',
        'Total: $588.75'
      ],
      total: '$588.75'
    }
  ]

  const pageSeo = {
    title: 'Caribbean Air Cargo Rates | QCS Cargo Pricing',
    description: 'View the latest QCS Cargo air cargo rates, transit times, and service options for Caribbean destinations.',
    canonicalPath: '/rates'
  }

  return (
    <MarketingLayout seo={pageSeo}>
      <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="bg-yellow-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <DollarSign className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Transparent Pricing & Rate Guide
          </h1>
          <p className="text-xl text-primary-foreground/90 max-w-3xl mx-auto">
            Clear, competitive rates for air cargo shipping to the Caribbean. 
            No hidden fees, no surprises - just honest pricing for quality service.
          </p>
        </div>
      </section>

      {/* Tab Navigation */}
      <section className="py-8 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex justify-center">
            <div className="bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setSelectedTab('rates')}
                className={`px-6 py-3 rounded-md font-semibold transition-colors ${
                  selectedTab === 'rates'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-700 hover:text-primary'
                }`}
              >
                Base Rates
              </button>
              <button
                onClick={() => setSelectedTab('services')}
                className={`px-6 py-3 rounded-md font-semibold transition-colors ${
                  selectedTab === 'services'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-700 hover:text-primary'
                }`}
              >
                Additional Services
              </button>
              <button
                onClick={() => setSelectedTab('examples')}
                className={`px-6 py-3 rounded-md font-semibold transition-colors ${
                  selectedTab === 'examples'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-700 hover:text-primary'
                }`}
              >
                Rate Examples
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Base Rates Tab */}
      {selectedTab === 'rates' && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Base Shipping Rates by Destination
              </h2>
              <p className="text-xl text-slate-600">
                Per-pound rates based on weight tiers. Express service adds 25% surcharge.
              </p>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-slate-600 mt-4">Loading rate information...</p>
              </div>
            ) : (
              <div className="space-y-8">
                {destinations.map((destination) => (
                  <div key={destination.id} className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="bg-white bg-opacity-20 p-3 rounded-full mr-4">
                            <Plane className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold">{destination.country_name}</h3>
                            <p className="text-primary-foreground/90">{destination.city_name} ({destination.airport_code})</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-primary-foreground/90">Transit Time</div>
                          <div className="text-lg font-semibold">{destination.transit_days_min}-{destination.transit_days_max} days</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Rate Table */}
                        <div>
                          <h4 className="text-lg font-semibold mb-4">Standard Air Freight Rates</h4>
                          <div className="bg-gray-50 rounded-lg overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-gray-200">
                                <tr>
                                  <th className="text-left p-3 font-semibold">Weight Range</th>
                                  <th className="text-right p-3 font-semibold">Rate per lb</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-b border-gray-200">
                                  <td className="p-3">1-50 lbs</td>
                                  <td className="text-right p-3 font-medium">${destination.rate_per_lb_1_50.toFixed(2)}</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                  <td className="p-3">51-100 lbs</td>
                                  <td className="text-right p-3 font-medium">${destination.rate_per_lb_51_100.toFixed(2)}</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                  <td className="p-3">101-200 lbs</td>
                                  <td className="text-right p-3 font-medium">${destination.rate_per_lb_101_200.toFixed(2)}</td>
                                </tr>
                                <tr className="bg-green-50">
                                  <td className="p-3 font-semibold">201+ lbs</td>
                                  <td className="text-right p-3 font-bold text-green-600">${destination.rate_per_lb_201_plus.toFixed(2)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                        
                        {/* Service Options */}
                        <div>
                          <h4 className="text-lg font-semibold mb-4">Service Options</h4>
                          <div className="space-y-4">
                            <div className="bg-primary/5 p-4 rounded-lg border-l-4 border-primary">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">Standard Service</span>
                                <span className="text-sm text-primary">Base Rate</span>
                              </div>
                              <p className="text-sm text-slate-600">
                                {destination.transit_days_min}-{destination.transit_days_max} business days transit time
                              </p>
                            </div>
                            
                            <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-600">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">Express Service</span>
                                <span className="text-sm text-yellow-600">+{destination.express_surcharge_percent}% Surcharge</span>
                              </div>
                              <p className="text-sm text-slate-600">
                                {Math.max(1, destination.transit_days_min - 1)}-{Math.max(2, destination.transit_days_max - 1)} business days (1-2 days faster)
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Important Notes */}
            <div className="mt-12 bg-primary/5 p-8 rounded-xl">
              <h3 className="text-xl font-semibold mb-6 flex items-center">
                <Info className="h-6 w-6 text-primary mr-2" />
                Important Rate Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h4 className="font-medium mb-2 text-primary">Dimensional Weight</h4>
                  <p className="text-gray-700 mb-4">
                    Calculated as Length ?? Width ?? Height ?? 166 (inches). Billable weight is the greater of actual or dimensional weight.
                  </p>
                  
                  <h4 className="font-medium mb-2 text-primary">Rate Validity</h4>
                  <p className="text-gray-700">
                    All rates are valid for 30 days from quote date and subject to change without notice.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2 text-primary">What's Included</h4>
                  <ul className="text-gray-700 space-y-1 mb-4">
                    <li>??? Professional packaging review</li>
                    <li>??? Customs documentation prep</li>
                    <li>??? Up to 7 days free storage</li>
                    <li>??? Shipment tracking</li>
                  </ul>
                  
                  <h4 className="font-medium mb-2 text-primary">Not Included</h4>
                  <p className="text-gray-700">
                    Customs duties, taxes, and destination country fees are customer responsibility.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Additional Services Tab */}
      {selectedTab === 'services' && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-slate-900 mb-4">
                  Additional Services & Fees
                </h2>
                <p className="text-xl text-slate-600">
                  Optional services to enhance your shipping experience
                </p>
              </div>

              {/* Handling & Processing Services */}
              <div className="mb-12">
                <h3 className="text-2xl font-semibold mb-6 flex items-center">
                  <Package className="h-6 w-6 text-primary mr-2" />
                  Handling & Processing Services
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {additionalServices.map((service, index) => (
                    <div key={index} className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-slate-900">{service.service}</h4>
                        <span className="text-primary font-bold whitespace-nowrap ml-4">{service.price}</span>
                      </div>
                      <p className="text-slate-600 text-sm">{service.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Insurance Options */}
              <div className="mb-12">
                <h3 className="text-2xl font-semibold mb-6 flex items-center">
                  <Shield className="h-6 w-6 text-green-600 mr-2" />
                  Insurance & Protection
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {insuranceRates.map((insurance, index) => (
                    <div key={index} className="bg-white border-2 border-green-200 p-6 rounded-lg">
                      <h4 className="font-semibold text-slate-900 mb-2">{insurance.coverage}</h4>
                      <div className="text-2xl font-bold text-green-600 mb-2">{insurance.price}</div>
                      <p className="text-slate-600 text-sm">{insurance.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Volume Discounts */}
              <div>
                <h3 className="text-2xl font-semibold mb-6 flex items-center">
                  <DollarSign className="h-6 w-6 text-purple-600 mr-2" />
                  Volume Discount Program
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {volumeDiscounts.map((discount, index) => (
                    <div key={index} className="bg-white border-2 border-purple-200 p-6 rounded-lg text-center">
                      <div className="text-lg font-medium text-slate-900 mb-2">{discount.range}</div>
                      <div className="text-3xl font-bold text-purple-600 mb-2">{discount.discount}</div>
                      <div className="text-sm text-slate-600">{discount.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Rate Examples Tab */}
      {selectedTab === 'examples' && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-slate-900 mb-4">
                  Real-World Rate Examples
                </h2>
                <p className="text-xl text-slate-600">
                  See how our rates work with actual shipping scenarios
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {rateExamples.map((example, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6">
                      <h3 className="text-xl font-bold mb-2">{example.title}</h3>
                      <p className="text-primary-foreground/90">{example.details}</p>
                    </div>
                    
                    <div className="p-6">
                      <h4 className="font-semibold mb-4">Rate Calculation:</h4>
                      <div className="space-y-2 mb-4">
                        {example.calculation.map((line, lineIndex) => (
                          <div key={lineIndex} className="text-sm text-gray-700">{line}</div>
                        ))}
                      </div>
                      
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold">Total Cost:</span>
                          <span className="text-2xl font-bold text-green-600">{example.total}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-12 bg-yellow-50 p-8 rounded-xl border border-yellow-200">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-slate-900 mb-4">
                    Need a Custom Quote?
                  </h3>
                  <p className="text-gray-700 mb-6">
                    Every shipment is unique. Use our calculator for precise rates based on your specific requirements, 
                    or contact our team for volume pricing and business accounts.
                  </p>
                  <div className="space-x-4">
                    <button className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors">
                      Use Rate Calculator
                    </button>
                    <button className="border border-primary text-primary px-8 py-3 rounded-lg font-semibold hover:bg-primary/5 transition-colors">
                      Contact for Quote
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Calculate Your Shipping Cost?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Get an instant quote with our shipping calculator or contact our team for personalized service.
          </p>
          <div className="space-x-4">
            <button className="bg-yellow-500 text-primary px-8 py-4 rounded-lg text-lg font-bold hover:bg-yellow-400 transition-colors">
              Calculate Rates Now
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-primary transition-colors">
              Contact Our Team
            </button>
          </div>
        </div>
      </section>
      </div>
    </MarketingLayout>
  )
}

