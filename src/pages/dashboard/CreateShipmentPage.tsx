import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Destination } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { AuthLayout } from '@/components/layout/AuthLayout'
import {
  Loader2,
  Package,
  Plus,
  Trash2,
  AlertCircle,
  Calculator
} from 'lucide-react'
import { logger } from '@/lib/logger'
import { handleShipmentError } from '@/lib/errorHandlers'
import { draftStorage } from '@/lib/draftStorage'
import { StepIndicator } from '@/components/StepIndicator'

interface ShipmentItem {
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

interface ShipmentFormData {
  destination_id: string
  service_level: string
  pickup_date: string
  special_instructions: string
  declared_value: number
  items: ShipmentItem[]
}

const serviceTypes = [
  { value: 'standard', label: 'Standard (3-5 days)', description: 'Most economical option' },
  { value: 'express', label: 'Express (1-2 days)', description: 'Faster delivery with premium service' }
]

const itemCategories = [
  { value: 'general', label: 'General Merchandise' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'clothing', label: 'Clothing & Textiles' },
  { value: 'food', label: 'Non-perishable Food' },
  { value: 'documents', label: 'Documents' },
  { value: 'automotive', label: 'Automotive Parts' },
  { value: 'medical', label: 'Medical Supplies' },
  { value: 'other', label: 'Other' }
]

export default function CreateShipmentPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [formData, setFormData] = useState<ShipmentFormData>({
    destination_id: '',
    service_level: 'standard',
    pickup_date: '',
    special_instructions: '',
    declared_value: 0,
    items: [{
      description: '',
      weight: 0,
      quantity: 1,
      category: 'general'
    }]
  })
  const [estimatedCost, setEstimatedCost] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [destinationsLoading, setDestinationsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [createdShipmentId, setCreatedShipmentId] = useState<string>('')
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    { id: 'destination', label: 'Destination & Service', description: 'Select destination and service level' },
    { id: 'items', label: 'Shipment Items', description: 'Add items to ship' },
    { id: 'details', label: 'Additional Details', description: 'Special instructions and dates' },
    { id: 'review', label: 'Review & Confirm', description: 'Review and submit' }
  ]

  useEffect(() => {
    loadDestinations()
    // Load draft on mount
    const draft = draftStorage.load<ShipmentFormData>('create_shipment')
    if (draft) {
      setFormData(draft)
      logger.debug('Loaded draft shipment', { component: 'CreateShipmentPage' })
    }
  }, [])

  // Auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.destination_id || formData.items.some(item => item.description || item.weight > 0)) {
        draftStorage.save('create_shipment', formData)
      }
    }, 1000) // Debounce 1 second

    return () => clearTimeout(timer)
  }, [formData])

  useEffect(() => {
    if (formData.destination_id && formData.items.length > 0) {
      calculateEstimatedCost()
    }
    
    // Update current step based on form completion
    if (!formData.destination_id) {
      setCurrentStep(0)
    } else if (formData.items.some(item => !item.description || item.weight <= 0)) {
      setCurrentStep(1)
    } else if (!formData.special_instructions && !formData.pickup_date) {
      setCurrentStep(2)
    } else {
      setCurrentStep(3)
    }
  }, [formData.destination_id, formData.items, formData.service_level, formData.special_instructions, formData.pickup_date])

  // Handle URL parameters for pre-populating form data from shipping calculator
  useEffect(() => {
    if (destinations.length === 0) return // Wait for destinations to load

    const destinationIdParam = searchParams.get('destination_id')
    const weightParam = searchParams.get('weight')
    const serviceTypeParam = searchParams.get('service_type')
    const declaredValueParam = searchParams.get('declared_value')
    const lengthParam = searchParams.get('length')
    const widthParam = searchParams.get('width')
    const heightParam = searchParams.get('height')

    // Pre-populate destination
    if (destinationIdParam) {
      const destinationId = parseInt(destinationIdParam, 10)
      const validDestination = destinations.find(d => d.id === destinationId)
      if (validDestination) {
        updateFormData('destination_id', destinationId.toString())
      }
    }

    // Pre-populate service type
    if (serviceTypeParam && (serviceTypeParam === 'standard' || serviceTypeParam === 'express')) {
      updateFormData('service_level', serviceTypeParam)
    }

    // Pre-populate declared value
    if (declaredValueParam) {
      const declaredValue = parseFloat(declaredValueParam)
      if (!isNaN(declaredValue) && declaredValue > 0) {
        updateFormData('declared_value', declaredValue)
      }
    }

    // Pre-populate first item with weight and dimensions from calculator
    if (weightParam || lengthParam || widthParam || heightParam) {
      const weight = weightParam ? parseFloat(weightParam) : 0
      const length = lengthParam ? parseFloat(lengthParam) : undefined
      const width = widthParam ? parseFloat(widthParam) : undefined
      const height = heightParam ? parseFloat(heightParam) : undefined

      setFormData(prev => ({
        ...prev,
        items: [{
          ...prev.items[0],
          description: prev.items[0].description || 'Items from shipping calculator',
          weight: weight > 0 ? weight : prev.items[0].weight,
          length,
          width,
          height
        }]
      }))
    }
  }, [destinations, searchParams])

  const loadDestinations = async () => {
    try {
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .eq('is_active', true)
        .order('country_name')
      
      if (error) throw error
      setDestinations(data || [])
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      logger.error('Error loading destinations', error, {
        component: 'CreateShipmentPage',
        action: 'loadDestinations'
      })
      setError('Failed to load destination options')
    } finally {
      setDestinationsLoading(false)
    }
  }

  const calculateEstimatedCost = async () => {
    if (!formData.destination_id || formData.items.length === 0) return

    try {
      const selectedDestination = destinations.find(d => d.id.toString() === formData.destination_id)
      if (!selectedDestination) return

      const totalWeight = formData.items.reduce((sum, item) => 
        sum + (item.weight * item.quantity), 0)
      
      // Calculate cost based on weight tiers
      let ratePerLb: number
      if (totalWeight <= 50) {
        ratePerLb = selectedDestination.rate_per_lb_1_50
      } else if (totalWeight <= 100) {
        ratePerLb = selectedDestination.rate_per_lb_51_100
      } else if (totalWeight <= 200) {
        ratePerLb = selectedDestination.rate_per_lb_101_200
      } else {
        ratePerLb = selectedDestination.rate_per_lb_201_plus
      }
      
      let cost = totalWeight * ratePerLb
      
      // Add express service surcharge
      if (formData.service_level === 'express') {
        cost = cost * (1 + selectedDestination.express_surcharge_percent / 100)
      }
      
      // Add insurance if declared value exists
      if (formData.declared_value > 0) {
        cost += formData.declared_value * 0.02 // 2% insurance
      }
      
      setEstimatedCost(cost)
    } catch (err) {
      logger.error('Error calculating cost', err instanceof Error ? err : new Error(String(err)), {
        component: 'CreateShipmentPage',
        action: 'calculateEstimatedCost'
      })
    }
  }

  const updateFormData = (field: keyof ShipmentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        description: '',
        weight: 0,
        quantity: 1,
        category: 'general'
      }]
    }))
  }

  const updateItem = (index: number, field: keyof ShipmentItem, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Enhanced validation
      if (!formData.destination_id) {
        throw new Error('Please select a destination')
      }
      
      if (formData.items.some(item => !item.description || item.weight <= 0 || item.quantity <= 0)) {
        throw new Error('Please fill in all item details with valid weights and quantities')
      }

      // Validate destination_id is a valid number
      const destinationId = parseInt(formData.destination_id, 10)
      if (isNaN(destinationId)) {
        throw new Error('Invalid destination selected')
      }

      logger.debug('Submitting shipment', {
        component: 'CreateShipmentPage',
        action: 'handleSubmit',
        destination_id: destinationId,
        service_level: formData.service_level,
        items_count: formData.items.length
      })

      // Create shipment using edge function with enhanced error handling
      const { data, error } = await supabase.functions.invoke('create-shipment', {
        body: {
          destination_id: destinationId,
          service_level: formData.service_level,
          pickup_date: formData.pickup_date || null,
          special_instructions: formData.special_instructions,
          declared_value: formData.declared_value || null,
          items: formData.items
        }
      })

      // Enhanced error handling for different error types
      if (error) {
        logger.error('Supabase function error', error, {
          component: 'CreateShipmentPage',
          action: 'createShipment'
        })
        
        // Handle different types of errors
        if (error.message?.includes('FunctionsHttpError')) {
          throw new Error('Server error occurred. Please try again or contact support if the problem persists.')
        } else if (error.message?.includes('FunctionsFetchError')) {
          throw new Error('Network error. Please check your connection and try again.')
        } else if (error.message?.includes('authentication')) {
          throw new Error('Authentication error. Please log in again.')
        } else {
          throw new Error(error.message || 'Failed to create shipment')
        }
      }

      // Handle server-side errors returned in data
      if (data?.error) {
        logger.error('Server-side error', new Error(String(data.error)), {
          component: 'CreateShipmentPage',
          action: 'createShipment'
        })
        
        const serverError = data.error
        if (serverError.code === 'SHIPMENT_CREATION_FAILED') {
          // Parse specific database errors
          if (serverError.message?.includes('foreign key')) {
            throw new Error('Invalid destination selected. Please choose a different destination.')
          } else if (serverError.message?.includes('authentication')) {
            throw new Error('Session expired. Please log in again.')
          } else if (serverError.message?.includes('Missing required fields')) {
            throw new Error('Please fill in all required fields.')
          } else {
            throw new Error(`Server error: ${serverError.message}`)
          }
        } else {
          throw new Error(serverError.message || 'Failed to create shipment')
        }
      }

      // Validate successful response
      const shipmentResult = data?.data
      if (shipmentResult?.success && shipmentResult?.shipment) {
      logger.info('Shipment created successfully', {
        component: 'CreateShipmentPage',
        action: 'createShipment',
        shipment_id: shipmentResult.id
      })
        setSuccess(true)
        setCreatedShipmentId(shipmentResult.shipment.id || '')
        
        // Clear draft on success
        draftStorage.clear('create_shipment')
        
        // Clear form data on success
        setFormData({
          destination_id: '',
          service_level: 'standard',
          pickup_date: '',
          special_instructions: '',
          declared_value: 0,
          items: [{
            description: '',
            weight: 0,
            quantity: 1,
            category: 'general'
          }]
        })
      } else {
        logger.error('Unexpected response format', new Error('Invalid response structure'), {
          component: 'CreateShipmentPage',
          action: 'createShipment'
        })
        throw new Error('Unexpected server response. Please try again.')
      }

    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      logger.error('Shipment creation error', error, {
        component: 'CreateShipmentPage',
        action: 'handleSubmit'
      })
      
      // Use enhanced error handler
      const userMessage = handleShipmentError(err, {
        destination_id: formData.destination_id,
        items_count: formData.items.length
      })
      setError(userMessage)
    } finally {
      setLoading(false)
    }
  }

  const getTotalWeight = () => {
    return formData.items.reduce((sum, item) => sum + (item.weight * item.quantity), 0)
  }

  const getTotalValue = () => {
    return formData.items.reduce((sum, item) => sum + ((item.value || 0) * item.quantity), 0)
  }

  if (destinationsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading destinations...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-green-600">Shipment Created Successfully!</CardTitle>
            <CardDescription>
              Your shipment has been created and is now being processed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 font-medium mb-1">
                  {createdShipmentId ? `Shipment ID: ${createdShipmentId}` : 'Shipment created successfully!'}
                </p>
                <p className="text-xs text-green-600">
                  Your shipment has been created and will be processed shortly.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => navigate('/dashboard')} 
                  className="flex-1"
                  variant="default"
                >
                  Return to Dashboard
                </Button>
                <Button
                  onClick={() => {
                    // Clear URL parameters when creating another shipment
                    navigate('/dashboard/create-shipment', { replace: true })
                    window.location.reload()
                  }}
                  className="flex-1"
                  variant="outline"
                >
                  Create Another Shipment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <AuthLayout back={{ href: "/dashboard", label: "Dashboard" }} showTabs={false}>
      <section className="px-4 pt-3 max-w-screen-md mx-auto">
        <h1 className="text-[clamp(22px,5.8vw,32px)] leading-tight font-extrabold text-slate-900">
          Create New Shipment
        </h1>
        <p className="mt-1 text-slate-600 text-[clamp(13px,3.6vw,16px)]">
          Fill in the details below to create your shipment to the Caribbean
        </p>

        {/* Step Indicator */}
        <div className="mt-6 mb-6">
          <StepIndicator 
            steps={steps}
            currentStep={currentStep}
            completedSteps={[]}
          />
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Draft Notice */}
        {draftStorage.exists('create_shipment') && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              We've saved a draft of your shipment. Your progress is automatically saved.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mt-4 rounded-2xl border border-slate-200 p-4">
          <h2 className="text-lg font-semibold mb-4">Destination & Service</h2>

          <label className="block text-sm font-medium text-slate-700">Destination Country</label>
          <div className="mt-1">
            <select
              value={formData.destination_id}
              onChange={(e) => updateFormData('destination_id', e.target.value)}
              className="w-full h-12 rounded-xl border border-slate-300 px-3 text-ellipsis"
            >
              <option value="">Select destination</option>
              {destinations.map((dest) => (
                <option key={dest.id} value={dest.id.toString()}>
                  {dest.country_name} ({dest.city_name}) - From ${dest.rate_per_lb_201_plus}/lb
                </option>
              ))}
            </select>
          </div>

          <label className="mt-4 block text-sm font-medium text-slate-700">Service Level</label>
          <div className="mt-1">
            <select
              value={formData.service_level}
              onChange={(e) => updateFormData('service_level', e.target.value)}
              className="w-full h-12 rounded-xl border border-slate-300 px-3 text-ellipsis"
            >
              {serviceTypes.map((service) => (
                <option key={service.value} value={service.value}>
                  {service.label}
                </option>
              ))}
            </select>
          </div>

          <label className="mt-4 block text-sm font-medium text-slate-700">Preferred Pickup Date (Optional)</label>
          <input
            className="mt-1 w-full h-12 rounded-xl border border-slate-300 px-3"
            type="date"
            value={formData.pickup_date}
            onChange={(e) => updateFormData('pickup_date', e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />

          <label className="mt-4 block text-sm font-medium text-slate-700">Declared Value (USD) — Optional</label>
          <input
            className="mt-1 w-full h-12 rounded-xl border border-slate-300 px-3"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={formData.declared_value || ''}
            onChange={(e) => updateFormData('declared_value', parseFloat(e.target.value) || 0)}
          />
        </div>

          {/* Items - simplified form */}
          <div className="mt-4 rounded-2xl border border-slate-200 p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Shipment Items</h2>
              <button
                type="button"
                onClick={addItem}
                className="text-sm text-shopify-pink hover:text-shopify-maroon"
              >
                + Add Item
              </button>
            </div>
            
            {formData.items.map((item, index) => (
              <div key={index} className="mb-4 p-3 border rounded-xl">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-slate-900">Item {index + 1}</h3>
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                    <input
                      className="w-full h-10 rounded-lg border border-slate-300 px-3"
                      placeholder="e.g., Electronics, Clothing, etc."
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Weight (lbs) *</label>
                      <input
                        className="w-full h-10 rounded-lg border border-slate-300 px-3"
                        type="number"
                        step="0.1"
                        min="0.1"
                        placeholder="0.0"
                        value={item.weight || ''}
                        onChange={(e) => updateItem(index, 'weight', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Quantity *</label>
                      <input
                        className="w-full h-10 rounded-lg border border-slate-300 px-3"
                        type="number"
                        min="1"
                        placeholder="1"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Special Instructions */}
          <div className="mt-4 rounded-2xl border border-slate-200 p-4">
            <h2 className="text-lg font-semibold mb-3">Special Instructions</h2>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Special handling requirements, delivery instructions, etc."
              value={formData.special_instructions}
              onChange={(e) => updateFormData('special_instructions', e.target.value)}
              rows={3}
            />
          </div>

          {/* Summary - compact */}
          <div className="mt-4 rounded-2xl border border-slate-200 p-4 bg-slate-50">
            <h3 className="font-semibold mb-3 flex items-center">
              <Calculator className="h-5 w-5 mr-2" />
              Shipment Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-blue-600">{formData.items.length}</p>
                <p className="text-xs text-slate-600">Items</p>
              </div>
              <div>
                <p className="text-xl font-bold text-green-600">{getTotalWeight().toFixed(1)} lbs</p>
                <p className="text-xs text-slate-600">Total Weight</p>
              </div>
              <div>
                <p className="text-xl font-bold text-purple-600">${getTotalValue().toFixed(2)}</p>
                <p className="text-xs text-slate-600">Total Value</p>
              </div>
              <div>
                <p className="text-xl font-bold text-orange-600">${estimatedCost.toFixed(2)}</p>
                <p className="text-xs text-slate-600">Estimated Cost</p>
              </div>
            </div>
          </div>

          {/* Submit - sticky bottom */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t md:relative md:border-0 md:bg-transparent md:p-0">
            <div className="max-w-screen-md mx-auto flex gap-3">
              <Link
                to="/dashboard"
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-medium text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-xl bg-shopify-pink text-white font-medium disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <Package className="mr-2 h-4 w-4" />
                    Create Shipment
                  </span>
                )}
              </button>
            </div>
          </div>
        </form>
      </section>
    </AuthLayout>
  )
}