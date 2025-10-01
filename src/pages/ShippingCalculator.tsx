import React, { useState, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { Calculator, Package, Plane, DollarSign, Clock, AlertCircle, Truck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Destination, CalculatedRate, ShippingCalculatorData } from '@/lib/types'
import { MarketingLayout } from '@/components/layout/MarketingLayout'
import QuoteEmailModal from '@/components/quotes/QuoteEmailModal'

export default function ShippingCalculator() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
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
  const [showQuoteModal, setShowQuoteModal] = useState(false)

  // Load destinations on component mount
  useEffect(() => {
    loadDestinations()
  }, [])

  // Pre-select destination from URL parameters (only if not already chosen)
  useEffect(() => {
    const destinationId = searchParams.get('destination')
    if (destinationId) {
      const id = parseInt(destinationId, 10)
      if (!Number.isNaN(id) && formData.destinationId === 0) {
        setFormData(prev => ({
          ...prev,
          destinationId: id
        }))
      }
    }
  }, [searchParams, formData.destinationId])

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
    setShowQuoteModal(false)
  }

  const handleCreateShipment = () => {
    if (!user) {
      // User not logged in - redirect to login with return URL to create shipment page
      const params = new URLSearchParams({
        destination_id: formData.destinationId.toString(),
        weight: formData.weight.toString(),
        service_type: formData.serviceType,
        declared_value: formData.declaredValue.toString()
      })
      const returnUrl = encodeURIComponent(`/dashboard/create-shipment?${params.toString()}`)
      navigate(`/auth/login?returnUrl=${returnUrl}`)
    } else {
      // User is logged in - navigate directly to create shipment page with pre-filled data
      const params = new URLSearchParams({
        destination_id: formData.destinationId.toString(),
        weight: formData.weight.toString(),
        service_type: formData.serviceType,
        declared_value: formData.declaredValue.toString(),
        ...(formData.dimensions?.length && { length: formData.dimensions.length.toString() }),
        ...(formData.dimensions?.width && { width: formData.dimensions.width.toString() }),
        ...(formData.dimensions?.height && { height: formData.dimensions.height.toString() })
      })
      navigate(`/dashboard/create-shipment?${params.toString()}`)
    }
  }

  const handleRequestQuote = () => {
    if (!calculatedRate) {
      setError('Please calculate a shipping rate before requesting an email quote.')
      return
    }
    setShowQuoteModal(true)
  }

  const pageSeo = {
    title: 'Caribbean Shipping Calculator | QCS Cargo Rates',
    description: 'Estimate air cargo rates from New Jersey to Caribbean destinations in minutes with the QCS Cargo calculator.',
    canonicalPath: '/shipping-calculator'
  }

  return (
    <MarketingLayout seo={pageSeo} showDesktopBreadcrumb={true} breadcrumbSlot={
      <div className="px-6 py-3">
        <p className="text-sm text-slate-600">Home / Shipping Calculator</p>
      </div>
    }>
      <section className="px-4 pt-3 max-w-screen-md mx-auto">
        {/* Mobile breadcrumb - hidden on desktop */}
        <p className="md:hidden text-xs text-slate-500 mt-1 mb-3">
          Home / Shipping Calculator
        </p>

        {/* Page Title & Subtitle - responsive sizing */}
        <h1 className="text-[clamp(22px,6.2vw,36px)] leading-tight tracking-[-0.01em] font-extrabold text-slate-900 text-balance">
          Caribbean Shipping Calculator
        </h1>
        <p className="mt-2 text-[clamp(14px,3.8vw,18px)] leading-snug text-slate-600">
          Get instant quotes for air cargo shipping from New Jersey to the Caribbean
        </p>

        <section className="mt-5 rounded-2xl border border-slate-200 shadow-sm p-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-violet-600" />
            Shipment Details
          </h2>

          {/* Weight Input - with proper input group styling */}
          <label className="mt-4 block text-sm font-medium text-slate-700">Weight *</label>
          <div className="mt-1.5 flex">
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={weightUnit === 'lbs' ? formData.weight || '' : convertWeight(formData.weight, 'lbs', 'kg') || ''}
              onChange={(e) => handleWeightChange(parseFloat(e.target.value) || 0)}
              className="scroll-mb-sticky w-full h-12 rounded-l-xl border border-slate-300 px-3 outline-none focus:ring-4 focus:ring-violet-200"
              placeholder="Enter weight"
              inputMode="decimal"
            />
            <select
              value={weightUnit}
              onChange={(e) => setWeightUnit(e.target.value as 'lbs' | 'kg')}
              className="scroll-mb-sticky h-12 rounded-r-xl border border-l-0 border-slate-300 px-3 bg-slate-50 hover:bg-slate-100"
            >
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
            </select>
          </div>

          {/* Dimensions - compact mobile layout */}
          <label className="mt-4 block text-sm font-medium text-slate-700">Dimensions (inches) - Optional</label>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
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
              className="scroll-mb-sticky h-12 rounded-xl border border-slate-300 px-3"
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
              className="scroll-mb-sticky h-12 rounded-xl border border-slate-300 px-3"
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
              className="scroll-mb-sticky h-12 rounded-xl border border-slate-300 px-3"
            />
          </div>

          {/* Destination - compact select */}
          <label className="mt-4 block text-sm font-medium text-slate-700">Destination *</label>
          <select
            value={formData.destinationId || ''}
            onChange={(e) => setFormData({ ...formData, destinationId: parseInt(e.target.value) || 0 })}
            className="scroll-mb-sticky w-full h-12 rounded-xl border border-slate-300 px-3"
          >
            <option value="">Select destination...</option>
            {destinations.map((dest) => (
              <option key={dest.id} value={dest.id}>
                {dest.country_name} - {dest.city_name}
              </option>
            ))}
          </select>

          {/* Service Type - compact radio buttons */}
          <label className="mt-4 block text-sm font-medium text-slate-700">Service Level</label>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <label className="flex items-center h-12 rounded-xl border border-slate-300 px-3 cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name="serviceType"
                value="standard"
                checked={formData.serviceType === 'standard'}
                onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as 'standard' | 'express' })}
                className="mr-2"
              />
              <div>
                <div className="font-medium text-sm">Standard</div>
                <div className="text-xs text-slate-500">Regular</div>
              </div>
            </label>
            <label className="flex items-center h-12 rounded-xl border border-slate-300 px-3 cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name="serviceType"
                value="express"
                checked={formData.serviceType === 'express'}
                onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as 'standard' | 'express' })}
                className="mr-2"
              />
              <div>
                <div className="font-medium text-sm">Express</div>
                <div className="text-xs text-slate-500">+25% faster</div>
              </div>
            </label>
          </div>

          {/* Declared Value - compact input */}
          <label className="mt-4 block text-sm font-medium text-slate-700">Declared Value (USD) - Optional</label>
          <input
            type="number"
            min="0"
            value={formData.declaredValue || ''}
            onChange={(e) => setFormData({ ...formData, declaredValue: parseFloat(e.target.value) || 0 })}
            className="scroll-mb-sticky w-full h-12 rounded-xl border border-slate-300 px-3"
            placeholder="For insurance"
          />

          {/* Error Message - compact */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start">
              <AlertCircle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {/* Buttons - compact */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={calculateShipping}
              disabled={loading}
              className="flex-1 bg-indigo-700 text-white h-12 rounded-xl font-semibold hover:bg-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>Calculate</>
              )}
            </button>
            <button
              onClick={resetCalculator}
              className="px-4 h-12 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
            >
              Reset
            </button>
          </div>
        </section>

        {/* Results Section - compact for mobile */}
        {calculatedRate && (
          <section className="mt-5 rounded-2xl border border-slate-200 shadow-sm p-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-600" />
              Your Quote
            </h2>

            {/* Destination Info - compact */}
            <div className="bg-indigo-50 p-3 rounded-xl mb-4">
              <div className="flex items-center mb-1">
                <Plane className="h-4 w-4 text-indigo-700 mr-2" />
                <span className="font-medium text-indigo-900 text-sm">
                  From New Jersey to {calculatedRate.destination.country}
                </span>
              </div>
              <div className="text-xs text-indigo-800">
                {calculatedRate.destination.city ? `${calculatedRate.destination.city}, ` : ''}
                Estimated transit: {calculatedRate.transitTime.estimate}
              </div>
            </div>

            {/* Total Cost - prominent */}
            <div className="bg-green-50 p-4 rounded-xl border-2 border-green-200 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-green-900">Total Cost:</span>
                <span className="text-xl font-bold text-green-600">
                  ${calculatedRate.rateBreakdown.totalCost.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-green-700 mt-1">
                Valid for 7 days • Excludes customs duties & taxes
              </p>
            </div>

            {/* Action Buttons - compact */}
            <div className="space-y-2">
              <button
                onClick={handleCreateShipment}
                className="w-full bg-indigo-700 text-white h-10 rounded-xl font-semibold hover:bg-indigo-800 transition-colors flex items-center justify-center"
              >
                <Package className="h-4 w-4 mr-2" />
                {user ? 'Create Shipment' : 'Sign In'}
              </button>
              <button
                onClick={handleRequestQuote}
                className="w-full border border-indigo-700 text-indigo-700 h-10 rounded-xl font-semibold hover:bg-indigo-50 transition-colors"
              >
                Request Quote via Email
              </button>
            </div>
          </section>
        )}
      </section>
      {calculatedRate && (
        <QuoteEmailModal
          open={showQuoteModal}
          onClose={() => setShowQuoteModal(false)}
          calculatedRate={calculatedRate}
          formData={formData}
        />
      )}
    </MarketingLayout>
  )
}

