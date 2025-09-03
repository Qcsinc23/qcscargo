import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Calculator, Package, Plane, DollarSign, Clock, AlertCircle, Truck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Destination, CalculatedRate, ShippingCalculatorData } from '@/lib/types'

export default function ShippingCalculator() {
  const [searchParams] = useSearchParams()
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [formData, setFormData] = useState<ShippingCalculatorData>({
    weight: 0,
    dimensions: {
      length: 0,
      width: 0,
      height: 0
    },
    destinationId: 0,
    serviceType: 'standard',
    declaredValue: 0
  })
  const [calculatedRate, setCalculatedRate] = useState<CalculatedRate | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs')

  // Load destinations on component mount
  useEffect(() => {
    loadDestinations()
  }, [])

  // Pre-select destination from URL parameters
  useEffect(() => {
    const destinationId = searchParams.get('destination')
    const countryName = searchParams.get('country')
    
    if (destinationId && parseInt(destinationId)) {
      setFormData(prev => ({
        ...prev,
        destinationId: parseInt(destinationId)
      }))
    }
  }, [searchParams, destinations])

  const loadDestinations = async () => {
    try {
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .eq('is_active', true)
        .order('country_name')

      if (error) throw error
      setDestinations(data || [])
    } catch (err) {
      console.error('Error loading destinations:', err)
    }
  }

  const convertWeight = (weight: number, fromUnit: 'lbs' | 'kg', toUnit: 'lbs' | 'kg') => {
    if (fromUnit === toUnit) return weight
    if (fromUnit === 'kg' && toUnit === 'lbs') return weight * 2.20462
    if (fromUnit === 'lbs' && toUnit === 'kg') return weight / 2.20462
    return weight
  }

  const handleWeightChange = (value: number) => {
    const weightInLbs = weightUnit === 'kg' ? convertWeight(value, 'kg', 'lbs') : value
    setFormData({ ...formData, weight: weightInLbs })
  }

  const calculateShipping = async () => {
    if (!formData.weight || formData.weight <= 0) {
      setError('Please enter a valid weight')
      return
    }

    if (!formData.destinationId) {
      setError('Please select a destination')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.functions.invoke('shipping-calculator', {
        body: {
          weight: formData.weight,
          dimensions: formData.dimensions,
          destinationId: formData.destinationId,
          serviceType: formData.serviceType,
          declaredValue: formData.declaredValue
        }
      })

      if (error) throw error

      setCalculatedRate(data.data)
    } catch (err: any) {
      setError(err.message || 'Failed to calculate shipping rate')
    } finally {
      setLoading(false)
    }
  }

  const resetCalculator = () => {
    setFormData({
      weight: 0,
      dimensions: { length: 0, width: 0, height: 0 },
      destinationId: 0,
      serviceType: 'standard',
      declaredValue: 0
    })
    setCalculatedRate(null)
    setError(null)
  }

  return (
    <div className="bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calculator className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Caribbean Shipping Calculator
            </h1>
            <p className="text-xl text-gray-600">
              Get instant quotes for air cargo shipping from New Jersey to the Caribbean
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Calculator Form */}
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <Package className="h-6 w-6 mr-3 text-blue-600" />
                Shipment Details
              </h2>

              <div className="space-y-6">
                {/* Weight */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight *
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={weightUnit === 'lbs' ? formData.weight || '' : convertWeight(formData.weight, 'lbs', 'kg') || ''}
                      onChange={(e) => handleWeightChange(parseFloat(e.target.value) || 0)}
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter weight"
                    />
                    <select
                      value={weightUnit}
                      onChange={(e) => setWeightUnit(e.target.value as 'lbs' | 'kg')}
                      className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="lbs">lbs</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                </div>

                {/* Dimensions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dimensions (inches) - Optional
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      min="0"
                      value={formData.dimensions?.length || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        dimensions: {
                          ...formData.dimensions!,
                          length: parseFloat(e.target.value) || 0
                        }
                      })}
                      placeholder="Length"
                      className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="number"
                      min="0"
                      value={formData.dimensions?.width || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        dimensions: {
                          ...formData.dimensions!,
                          width: parseFloat(e.target.value) || 0
                        }
                      })}
                      placeholder="Width"
                      className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="number"
                      min="0"
                      value={formData.dimensions?.height || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        dimensions: {
                          ...formData.dimensions!,
                          height: parseFloat(e.target.value) || 0
                        }
                      })}
                      placeholder="Height"
                      className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Used for dimensional weight calculation (Length × Width × Height ÷ 166)
                  </p>
                </div>

                {/* Destination */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination *
                  </label>
                  <select
                    value={formData.destinationId}
                    onChange={(e) => setFormData({ ...formData, destinationId: parseInt(e.target.value) })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={0}>Select destination...</option>
                    {destinations.map((dest) => (
                      <option key={dest.id} value={dest.id}>
                        {dest.country_name} - {dest.city_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Service Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Level
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="serviceType"
                        value="standard"
                        checked={formData.serviceType === 'standard'}
                        onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as 'standard' | 'express' })}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium">Standard</div>
                        <div className="text-sm text-gray-500">Regular processing</div>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="serviceType"
                        value="express"
                        checked={formData.serviceType === 'express'}
                        onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as 'standard' | 'express' })}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium">Express</div>
                        <div className="text-sm text-gray-500">+25% for faster delivery</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Declared Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Declared Value (USD) - Optional
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.declaredValue || ''}
                    onChange={(e) => setFormData({ ...formData, declaredValue: parseFloat(e.target.value) || 0 })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="For insurance purposes"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Values over $100 will include additional insurance costs
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-red-700">{error}</span>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex space-x-4">
                  <button
                    onClick={calculateShipping}
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>Calculate Rate</>
                    )}
                  </button>
                  <button
                    onClick={resetCalculator}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <DollarSign className="h-6 w-6 mr-3 text-green-600" />
                Shipping Quote
              </h2>

              {calculatedRate ? (
                <div className="space-y-6">
                  {/* Destination Info */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Plane className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="font-medium text-blue-900">
                        New Jersey → {calculatedRate.destination.country}
                      </span>
                    </div>
                    <div className="text-sm text-blue-700">
                      Destination: {calculatedRate.destination.city}
                    </div>
                    <div className="flex items-center mt-2">
                      <Clock className="h-4 w-4 text-blue-600 mr-1" />
                      <span className="text-sm text-blue-700">
                        Transit Time: {calculatedRate.transitTime.estimate}
                      </span>
                    </div>
                  </div>

                  {/* Weight Breakdown */}
                  <div>
                    <h3 className="font-medium mb-2">Weight Calculation</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Actual Weight:</span>
                        <span>{calculatedRate.weight.actual} lbs</span>
                      </div>
                      {calculatedRate.weight.dimensional && (
                        <div className="flex justify-between">
                          <span>Dimensional Weight:</span>
                          <span>{calculatedRate.weight.dimensional.toFixed(2)} lbs</span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium border-t pt-1">
                        <span>Billable Weight:</span>
                        <span>{calculatedRate.weight.billable} lbs</span>
                      </div>
                    </div>
                  </div>

                  {/* Cost Breakdown */}
                  <div>
                    <h3 className="font-medium mb-2">Cost Breakdown</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Base Shipping ({calculatedRate.serviceType}):</span>
                        <span>${calculatedRate.rateBreakdown.baseShippingCost.toFixed(2)}</span>
                      </div>
                      {calculatedRate.rateBreakdown.expressSurcharge > 0 && (
                        <div className="flex justify-between">
                          <span>Express Surcharge:</span>
                          <span>${calculatedRate.rateBreakdown.expressSurcharge.toFixed(2)}</span>
                        </div>
                      )}
                      {calculatedRate.rateBreakdown.handlingFee > 0 && (
                        <div className="flex justify-between">
                          <span>Handling Fee:</span>
                          <span>${calculatedRate.rateBreakdown.handlingFee.toFixed(2)}</span>
                        </div>
                      )}
                      {calculatedRate.rateBreakdown.insuranceCost > 0 && (
                        <div className="flex justify-between">
                          <span>Insurance:</span>
                          <span>${calculatedRate.rateBreakdown.insuranceCost.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-green-900">Total Cost:</span>
                      <span className="text-2xl font-bold text-green-600">
                        ${calculatedRate.rateBreakdown.totalCost.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Rate valid for 30 days • Excludes customs duties & taxes
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <button className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                      Request Quote
                    </button>
                    <Link 
                      to={`/booking?destinationId=${formData.destinationId}&serviceType=${formData.serviceType}&weight=${formData.weight}`}
                      className="w-full border border-orange-500 text-orange-600 py-3 px-6 rounded-lg font-semibold hover:bg-orange-50 transition-colors flex items-center justify-center"
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Schedule Pickup with this Quote
                    </Link>
                    <button className="w-full border border-blue-600 text-blue-600 py-3 px-6 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                      Save Quote
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Enter shipment details to calculate rates</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Get instant quotes for Caribbean air cargo shipping
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div className="mt-12 bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-semibold mb-6">Important Notes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2 text-blue-600">What's Included</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Professional packaging review</li>
                  <li>• Customs documentation assistance</li>
                  <li>• Up to 7 days free storage</li>
                  <li>• Shipment tracking</li>
                  <li>• Basic handling and care</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2 text-red-600">Additional Costs</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Pickup service: $25 (within 25 miles)</li>
                  <li>• Consolidation: $5 per additional shipment</li>
                  <li>• Custom packaging: $10-75</li>
                  <li>• Extended storage: $0.75/lb/week</li>
                  <li>• Customs duties & taxes (varies by destination)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}