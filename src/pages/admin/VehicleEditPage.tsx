import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  MapPin,
  Settings,
  Truck,
  AlertTriangle,
  RefreshCw,
  Package
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface VehicleFormData {
  name: string
  capacity_lbs: number
  service_area: any
  active: boolean
  base_location_zip: string
  base_location_lat: number | null
  base_location_lng: number | null
  notes: string
}

const VehicleEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [formData, setFormData] = useState<VehicleFormData>({
    name: '',
    capacity_lbs: 1000,
    service_area: null,
    active: true,
    base_location_zip: '',
    base_location_lat: null,
    base_location_lng: null,
    notes: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [originalData, setOriginalData] = useState<VehicleFormData | null>(null)
  const [serviceAreaInput, setServiceAreaInput] = useState('')

  useEffect(() => {
    if (id) {
      loadVehicleData()
    }
  }, [id])

  const loadVehicleData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        throw new Error(error.message)
      }

      const vehicleData: VehicleFormData = {
        name: data.name || '',
        capacity_lbs: data.capacity_lbs || 1000,
        service_area: data.service_area,
        active: data.active ?? true,
        base_location_zip: data.base_location_zip || '',
        base_location_lat: data.base_location_lat || null,
        base_location_lng: data.base_location_lng || null,
        notes: data.notes || ''
      }

      setFormData(vehicleData)
      setOriginalData(vehicleData)
      setServiceAreaInput(data.service_area ? JSON.stringify(data.service_area, null, 2) : '')
    } catch (err) {
      console.error('Error loading vehicle:', err)
      setError(err instanceof Error ? err.message : 'Failed to load vehicle')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof VehicleFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleServiceAreaChange = (value: string) => {
    setServiceAreaInput(value)
    try {
      const parsed = value.trim() ? JSON.parse(value) : null
      setFormData(prev => ({ ...prev, service_area: parsed }))
    } catch (e) {
      // Invalid JSON, but keep the input for user to fix
      setFormData(prev => ({ ...prev, service_area: value.trim() || null }))
    }
  }

  const validateForm = (): string[] => {
    const errors: string[] = []

    if (!formData.name.trim()) {
      errors.push('Vehicle name is required')
    }

    if (formData.capacity_lbs <= 0) {
      errors.push('Capacity must be greater than 0')
    }

    if (!formData.base_location_zip.trim()) {
      errors.push('Base location ZIP code is required')
    }

    // Validate service area JSON if provided
    if (serviceAreaInput.trim()) {
      try {
        JSON.parse(serviceAreaInput)
      } catch (e) {
        errors.push('Service area must be valid JSON or empty')
      }
    }

    // Validate coordinates if provided
    if (formData.base_location_lat !== null && (formData.base_location_lat < -90 || formData.base_location_lat > 90)) {
      errors.push('Latitude must be between -90 and 90')
    }

    if (formData.base_location_lng !== null && (formData.base_location_lng < -180 || formData.base_location_lng > 180)) {
      errors.push('Longitude must be between -180 and 180')
    }

    return errors
  }

  const hasChanges = (): boolean => {
    if (!originalData) return false
    return JSON.stringify(formData) !== JSON.stringify(originalData) || 
           serviceAreaInput !== (originalData.service_area ? JSON.stringify(originalData.service_area, null, 2) : '')
  }

  const handleSave = async () => {
    const validationErrors = validateForm()
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0])
      return
    }

    try {
      setSaving(true)

      const updateData = {
        name: formData.name.trim(),
        capacity_lbs: formData.capacity_lbs,
        service_area: formData.service_area,
        active: formData.active,
        base_location_zip: formData.base_location_zip.trim(),
        base_location_lat: formData.base_location_lat,
        base_location_lng: formData.base_location_lng,
        notes: formData.notes.trim(),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('vehicles')
        .update(updateData)
        .eq('id', id)

      if (error) {
        throw new Error(error.message)
      }

      toast.success('Vehicle updated successfully')
      navigate(`/admin/vehicles/${id}`)
    } catch (err) {
      console.error('Error saving vehicle:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to save vehicle')
    } finally {
      setSaving(false)
    }
  }

  const handleCoordinateFromZip = async () => {
    if (!formData.base_location_zip.trim()) {
      toast.error('Please enter a ZIP code first')
      return
    }

    try {
      // This would typically call a geocoding service
      // For now, we'll just show a placeholder
      toast.info('Geocoding service would be integrated here')
    } catch (err) {
      console.error('Error geocoding ZIP:', err)
      toast.error('Failed to get coordinates for ZIP code')
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Vehicle</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => navigate('/admin/vehicles')}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Back to Vehicles
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <button
            onClick={() => navigate(`/admin/vehicles/${id}`)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-lg bg-blue-100">
              <Truck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Edit Vehicle
              </h1>
              <p className="text-gray-600">Modify vehicle details and settings</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 inline animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2 inline" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          
          <button
            onClick={() => navigate(`/admin/vehicles/${id}`)}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter vehicle name (e.g., Truck-001, Van-A)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={formData.active}
                      onChange={() => handleInputChange('active', true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Active</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!formData.active}
                      onChange={() => handleInputChange('active', false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Inactive</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Capacity Information */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Capacity Information
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Capacity (lbs)</label>
              <input
                type="number"
                value={formData.capacity_lbs}
                onChange={(e) => handleInputChange('capacity_lbs', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                step="1"
                placeholder="Enter maximum weight capacity in pounds"
              />
              <p className="mt-1 text-sm text-gray-500">
                Current capacity: {formData.capacity_lbs.toLocaleString()} lbs
              </p>
            </div>
          </div>
        </div>
        
        {/* Location Information */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Location Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Base Location ZIP Code</label>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={formData.base_location_zip}
                    onChange={(e) => handleInputChange('base_location_zip', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter ZIP code (e.g., 07001)"
                    maxLength={10}
                  />
                  <button
                    type="button"
                    onClick={handleCoordinateFromZip}
                    className="px-3 py-2 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    Get Coordinates
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
                  <input
                    type="number"
                    value={formData.base_location_lat || ''}
                    onChange={(e) => handleInputChange('base_location_lat', e.target.value ? parseFloat(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 40.7128"
                    step="any"
                    min="-90"
                    max="90"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
                  <input
                    type="number"
                    value={formData.base_location_lng || ''}
                    onChange={(e) => handleInputChange('base_location_lng', e.target.value ? parseFloat(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., -74.0060"
                    step="any"
                    min="-180"
                    max="180"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Service Area */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Area</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Service Area Configuration (JSON)</label>
              <textarea
                value={serviceAreaInput}
                onChange={(e) => handleServiceAreaChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                rows={8}
                placeholder={`Example:\n{\n  "zip_codes": ["07001", "07002", "07003"],\n  "max_distance_miles": 25,\n  "priority_zones": ["downtown", "business_district"]\n}`}
              />
              <p className="mt-1 text-sm text-gray-500">
                Define the service area for this vehicle as JSON. Leave empty if no restrictions.
              </p>
            </div>
          </div>
        </div>
        
        {/* Notes */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="Add any additional notes about this vehicle (maintenance schedule, special requirements, etc.)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VehicleEditPage