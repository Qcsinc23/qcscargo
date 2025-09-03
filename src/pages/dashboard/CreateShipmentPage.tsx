import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import { 
  Loader2, 
  Package, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Calculator,
  ArrowLeft
} from 'lucide-react'
import { Link } from 'react-router-dom'

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

  useEffect(() => {
    loadDestinations()
  }, [])

  useEffect(() => {
    if (formData.destination_id && formData.items.length > 0) {
      calculateEstimatedCost()
    }
  }, [formData.destination_id, formData.items, formData.service_level])

  // Handle URL parameters for pre-populating destination
  useEffect(() => {
    const destinationIdParam = searchParams.get('destination_id')
    if (destinationIdParam && destinations.length > 0) {
      const destinationId = parseInt(destinationIdParam, 10)
      // Check if this destination exists in our list
      const validDestination = destinations.find(d => d.id === destinationId)
      if (validDestination) {
        updateFormData('destination_id', destinationId.toString())
      }
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
    } catch (err: any) {
      console.error('Error loading destinations:', err)
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
      console.error('Error calculating cost:', err)
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

  const updateItem = (index: number, field: keyof ShipmentItem, value: any) => {
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
      // Validate form
      if (!formData.destination_id) {
        throw new Error('Please select a destination')
      }
      
      if (formData.items.some(item => !item.description || item.weight <= 0 || item.quantity <= 0)) {
        throw new Error('Please fill in all item details with valid weights and quantities')
      }

      // Create shipment using edge function
      const { data, error } = await supabase.functions.invoke('create-shipment', {
        body: {
          destination_id: formData.destination_id,
          service_level: formData.service_level,
          pickup_date: formData.pickup_date || null,
          special_instructions: formData.special_instructions,
          declared_value: formData.declared_value || null,
          items: formData.items
        }
      })

      if (error) {
        throw new Error(error.message || 'Failed to create shipment')
      }

      if (data?.error) {
        throw new Error(data.error.message || 'Failed to create shipment')
      }

      const shipmentResult = data?.data
      if (shipmentResult?.success && shipmentResult?.shipment) {
        setSuccess(true)
        setCreatedShipmentId(shipmentResult.shipment.id || '')
        // Remove automatic redirect to non-existent route
        // Users can use the "Return to Dashboard" button instead
      } else {
        throw new Error('Unexpected response format')
      }

    } catch (err: any) {
      console.error('Shipment creation error:', err)
      setError(err.message || 'Failed to create shipment')
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
                  onClick={() => navigate('/dashboard/create-shipment')} 
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Create New Shipment</h1>
          <p className="text-gray-600 mt-1">Fill in the details below to create your shipment to the Caribbean</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Destination and Service */}
          <Card>
            <CardHeader>
              <CardTitle>Destination & Service</CardTitle>
              <CardDescription>Choose where you're shipping and how fast you need it</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination Country</Label>
                  <Select value={formData.destination_id} onValueChange={(value) => updateFormData('destination_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinations.map((dest) => (
                        <SelectItem key={dest.id} value={dest.id.toString()}>
                          {dest.country_name} ({dest.city_name}) - From ${dest.rate_per_lb_201_plus}/lb
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="service">Service Level</Label>
                  <Select value={formData.service_level} onValueChange={(value) => updateFormData('service_level', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceTypes.map((service) => (
                        <SelectItem key={service.value} value={service.value}>
                          <div>
                            <div>{service.label}</div>
                            <div className="text-xs text-gray-500">{service.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pickup_date">Preferred Pickup Date (Optional)</Label>
                  <Input
                    id="pickup_date"
                    type="date"
                    value={formData.pickup_date}
                    onChange={(e) => updateFormData('pickup_date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="declared_value">Declared Value (USD) - Optional</Label>
                  <Input
                    id="declared_value"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.declared_value || ''}
                    onChange={(e) => updateFormData('declared_value', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Shipment Items</CardTitle>
                  <CardDescription>Add all items you want to ship</CardDescription>
                </div>
                <Button type="button" variant="outline" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-900">Item {index + 1}</h3>
                    {formData.items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="md:col-span-2 lg:col-span-1">
                      <Label>Description *</Label>
                      <Input
                        placeholder="e.g., Electronics, Clothing, etc."
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label>Category</Label>
                      <Select value={item.category} onValueChange={(value) => updateItem(index, 'category', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {itemCategories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Weight (lbs) *</Label>
                        <Input
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
                        <Label>Quantity *</Label>
                        <Input
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
                  
                  <Separator className="my-4" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Length (inches)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="0.0"
                        value={item.length || ''}
                        onChange={(e) => updateItem(index, 'length', parseFloat(e.target.value) || undefined)}
                      />
                    </div>
                    <div>
                      <Label>Width (inches)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="0.0"
                        value={item.width || ''}
                        onChange={(e) => updateItem(index, 'width', parseFloat(e.target.value) || undefined)}
                      />
                    </div>
                    <div>
                      <Label>Height (inches)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="0.0"
                        value={item.height || ''}
                        onChange={(e) => updateItem(index, 'height', parseFloat(e.target.value) || undefined)}
                      />
                    </div>
                    <div>
                      <Label>Value (USD)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={item.value || ''}
                        onChange={(e) => updateItem(index, 'value', parseFloat(e.target.value) || undefined)}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      placeholder="Any special handling instructions for this item..."
                      value={item.notes || ''}
                      onChange={(e) => updateItem(index, 'notes', e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Special Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Special Instructions</CardTitle>
              <CardDescription>Any additional information for handling your shipment</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Special handling requirements, delivery instructions, etc."
                value={formData.special_instructions}
                onChange={(e) => updateFormData('special_instructions', e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Shipment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{formData.items.length}</p>
                  <p className="text-sm text-gray-600">Items</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{getTotalWeight().toFixed(1)} lbs</p>
                  <p className="text-sm text-gray-600">Total Weight</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">${getTotalValue().toFixed(2)}</p>
                  <p className="text-sm text-gray-600">Total Value</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">${estimatedCost.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">Estimated Cost</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" asChild>
              <Link to="/dashboard">Cancel</Link>
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Shipment...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Create Shipment
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}