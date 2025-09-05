import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Settings,
  Search,
  Save,
  RotateCcw,
  Download,
  Upload,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  AlertTriangle,
  Info,
  History,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'

interface Setting {
  id: number
  setting_key: string
  setting_value: any
  default_value: any
  display_name: string
  description: string
  input_type: string
  validation_rules: any
  is_public: boolean
  is_system_critical: boolean
  affects_operations: boolean
  updated_at: string
}

interface SettingsData {
  settings: Record<string, Record<string, Setting[]>>
  total_count: number
  audit_trail?: any[]
}

interface AuditEntry {
  id: number
  setting_key: string
  category: string
  old_value: any
  new_value: any
  changed_by: string
  change_reason: string
  created_at: string
}

const AdminSettings: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Business']))
  const [showAuditTrail, setShowAuditTrail] = useState(false)
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([])
  const [changedSettings, setChangedSettings] = useState<Set<string>>(new Set())
  const [settingValues, setSettingValues] = useState<Record<string, any>>({})
  const [showSensitive, setShowSensitive] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadSettings()
  }, [selectedCategory, searchTerm])

  const loadSettings = async () => {
    try {
      setLoading(true)
      setError(null)

      const requestBody: any = {
        include_audit: false
      }

      if (selectedCategory !== 'all') {
        requestBody.category = selectedCategory
      }

      if (searchTerm) {
        requestBody.search_term = searchTerm
      }

      const { data, error } = await supabase.functions.invoke('admin-settings-get', {
        body: requestBody
      })

      if (error) {
        console.error('Settings fetch error:', error)
        throw new Error(error.message || 'Failed to load settings')
      }

      console.log('Settings data received:', data)
      if (data?.data) {
        setSettings(data.data)
        // Initialize setting values from current data
        const values: Record<string, any> = {}
        Object.entries(data.data.settings).forEach(([category, subcategories]) => {
          Object.entries(subcategories as Record<string, Setting[]>).forEach(([subcat, settingsList]) => {
            settingsList.forEach((setting: Setting) => {
              values[`${category}::${setting.setting_key}`] = setting.setting_value
            })
          })
        })
        setSettingValues(values)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err) {
      console.error('Error loading settings:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load settings'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const loadAuditTrail = async () => {
    try {
      const requestBody: any = {
        include_audit: true
      }

      if (selectedCategory !== 'all') {
        requestBody.category = selectedCategory
      }

      const { data, error } = await supabase.functions.invoke('admin-settings-get', {
        body: requestBody
      })

      if (error) {
        throw new Error(error.message || 'Failed to load audit trail')
      }

      if (data?.data?.audit_trail) {
        setAuditTrail(data.data.audit_trail)
        setShowAuditTrail(true)
      }
    } catch (err) {
      console.error('Error loading audit trail:', err)
      toast.error('Failed to load audit trail')
    }
  }

  const handleSettingChange = (category: string, settingKey: string, value: any) => {
    const key = `${category}::${settingKey}`
    setSettingValues(prev => ({
      ...prev,
      [key]: value
    }))
    setChangedSettings(prev => new Set(prev.add(key)))
  }

  const saveSetting = async (category: string, setting: Setting) => {
    try {
      setSaving(true)
      const key = `${category}::${setting.setting_key}`
      const newValue = settingValues[key]

      const { data, error } = await supabase.functions.invoke('admin-settings-update', {
        body: {
          setting_id: setting.id,
          new_value: newValue,
          change_reason: 'Updated via admin settings dashboard'
        }
      })

      if (error) {
        throw new Error(error.message || 'Failed to update setting')
      }

      setChangedSettings(prev => {
        const newSet = new Set(prev)
        newSet.delete(key)
        return newSet
      })

      toast.success(`${setting.display_name} updated successfully`)
      
      // Reload settings to get updated values
      await loadSettings()
    } catch (err) {
      console.error('Error saving setting:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save setting'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const resetSetting = async (category: string, setting: Setting) => {
    try {
      setSaving(true)
      
      const { data, error } = await supabase.functions.invoke('admin-settings-reset', {
        body: {
          setting_id: setting.id,
          reset_type: 'single',
          confirm_critical: true
        }
      })

      if (error) {
        throw new Error(error.message || 'Failed to reset setting')
      }

      toast.success(`${setting.display_name} reset to default`)
      
      // Update local values
      const key = `${category}::${setting.setting_key}`
      setSettingValues(prev => ({
        ...prev,
        [key]: setting.default_value
      }))
      
      setChangedSettings(prev => {
        const newSet = new Set(prev)
        newSet.delete(key)
        return newSet
      })
      
      // Reload settings
      await loadSettings()
    } catch (err) {
      console.error('Error resetting setting:', err)
      toast.error('Failed to reset setting')
    } finally {
      setSaving(false)
    }
  }

  const exportSettings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-settings-export', {
        body: {
          export_type: 'current',
          include_audit: false,
          categories: selectedCategory === 'all' ? undefined : [selectedCategory]
        }
      })

      if (error) {
        throw new Error(error.message || 'Failed to export settings')
      }

      // Create download link
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `qcs-cargo-settings-${selectedCategory}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Settings exported successfully')
    } catch (err) {
      console.error('Error exporting settings:', err)
      toast.error('Failed to export settings')
    }
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  const toggleSensitiveVisibility = (key: string) => {
    setShowSensitive(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  const renderSettingInput = (category: string, setting: Setting) => {
    const key = `${category}::${setting.setting_key}`
    const value = settingValues[key]
    const isChanged = changedSettings.has(key)
    const isSensitive = setting.input_type === 'password' || setting.setting_key.toLowerCase().includes('key') || setting.setting_key.toLowerCase().includes('secret')
    const showValue = !isSensitive || showSensitive.has(key)

    const commonProps = {
      className: `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-700 focus:border-pink-700 ${isChanged ? 'border-pink-300 bg-pink-50' : 'border-pink-300'}`,
      onChange: (e: any) => handleSettingChange(category, setting.setting_key, e.target.value)
    }

    switch (setting.input_type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => handleSettingChange(category, setting.setting_key, e.target.checked)}
              className="w-4 h-4 text-pink-700 border-pink-300 rounded focus:ring-pink-700"
            />
            <span className="text-sm text-pink-600">
              {value === true || value === 'true' ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        )

      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            step={setting.validation_rules?.step || 'any'}
            min={setting.validation_rules?.min}
            max={setting.validation_rules?.max}
            {...commonProps}
          />
        )

      case 'textarea':
        return (
          <textarea
            value={typeof value === 'string' ? value : JSON.stringify(value)}
            rows={3}
            {...commonProps}
          />
        )

      case 'select':
        return (
          <select value={value || ''} {...commonProps}>
            {setting.validation_rules?.options?.map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'password':
        return (
          <div className="relative">
            <input
              type={showValue ? 'text' : 'password'}
              value={value || ''}
              {...commonProps}
              className={`${commonProps.className} pr-10`}
            />
            <button
              type="button"
              onClick={() => toggleSensitiveVisibility(key)}
              className="absolute right-2 top-2 text-pink-500 hover:text-pink-600"
            >
              {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        )

      case 'json':
        return (
          <textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            rows={4}
            {...commonProps}
            placeholder="Enter valid JSON"
          />
        )

      default:
        return (
          <div className="relative">
            <input
              type={setting.input_type === 'email' ? 'email' : setting.input_type === 'url' ? 'url' : 'text'}
              value={isSensitive && !showValue ? '••••••••••••' : (value || '')}
              {...commonProps}
              className={`${commonProps.className} ${isSensitive ? 'pr-10' : ''}`}
              readOnly={isSensitive && !showValue}
            />
            {isSensitive && (
              <button
                type="button"
                onClick={() => toggleSensitiveVisibility(key)}
                className="absolute right-2 top-2 text-pink-500 hover:text-pink-600"
              >
                {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            )}
          </div>
        )
    }
  }

  const categories = settings ? Object.keys(settings.settings) : []
  const hasChanges = changedSettings.size > 0

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-gray-200 h-16 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Settings</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={loadSettings}
                className="mt-2 text-sm text-red-800 underline hover:text-red-900"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-rose-900 flex items-center">
              <Settings className="h-6 w-6 mr-2" />
              System Settings
            </h1>
            <p className="text-pink-600 mt-1">
              Configure system behavior, business rules, and operational parameters
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {hasChanges && (
              <div className="flex items-center text-pink-700 text-sm">
                <AlertTriangle className="h-4 w-4 mr-1" />
                {changedSettings.size} unsaved changes
              </div>
            )}
            <button
              onClick={loadAuditTrail}
              className="flex items-center px-3 py-2 text-sm text-pink-600 hover:text-rose-900 border border-pink-300 rounded-lg hover:bg-pink-50"
            >
              <History className="h-4 w-4 mr-1" />
              Audit Trail
            </button>
            <button
              onClick={exportSettings}
              className="flex items-center px-3 py-2 text-sm text-pink-600 hover:text-rose-900 border border-pink-300 rounded-lg hover:bg-pink-50"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </button>
            <button
              onClick={loadSettings}
              className="flex items-center px-3 py-2 text-sm text-pink-700 hover:text-pink-800 border border-pink-300 rounded-lg hover:bg-pink-50"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-pink-500" />
            <input
              type="text"
              placeholder="Search settings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-700 focus:border-pink-700"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-700 focus:border-pink-700"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Settings Content */}
      <div className="space-y-6">
        {settings && Object.entries(settings.settings).map(([category, subcategories]) => (
          <div key={category} className="bg-white rounded-lg border border-pink-200 overflow-hidden">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full px-6 py-4 bg-rose-50 hover:bg-rose-100 flex items-center justify-between text-left transition-colors"
            >
              <div>
                <h2 className="text-lg font-semibold text-rose-900">{category}</h2>
                <p className="text-sm text-pink-600 mt-1">
                  {Object.values(subcategories).reduce((total, settings) => total + settings.length, 0)} settings
                </p>
              </div>
              {expandedCategories.has(category) ? (
                <ChevronDown className="h-5 w-5 text-pink-500" />
              ) : (
                <ChevronRight className="h-5 w-5 text-pink-500" />
              )}
            </button>

            {/* Category Content */}
            {expandedCategories.has(category) && (
              <div className="divide-y divide-pink-200">
                {Object.entries(subcategories).map(([subcategory, settingsList]) => (
                  <div key={subcategory} className="p-6">
                    {subcategory !== 'General' && (
                      <h3 className="text-md font-medium text-rose-900 mb-4 border-b border-pink-100 pb-2">
                        {subcategory}
                      </h3>
                    )}
                    <div className="grid gap-6">
                      {settingsList.map((setting: Setting) => {
                        const key = `${category}::${setting.setting_key}`
                        const isChanged = changedSettings.has(key)
                        
                        return (
                          <div key={setting.id} className="border border-pink-200 rounded-lg p-4 hover:border-pink-300 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 mr-4">
                                <div className="flex items-center mb-2">
                                  <label className="text-sm font-medium text-rose-900">
                                    {setting.display_name}
                                  </label>
                                  {setting.is_system_critical && (
                                    <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                      Critical
                                    </span>
                                  )}
                                  {setting.affects_operations && (
                                    <span className="ml-2 px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                                      Operations
                                    </span>
                                  )}
                                  {setting.is_public && (
                                    <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                      Public
                                    </span>
                                  )}
                                </div>
                                {setting.description && (
                                  <p className="text-sm text-pink-600 mb-3">{setting.description}</p>
                                )}
                                <div className="space-y-2">
                                  {renderSettingInput(category, setting)}
                                  {setting.validation_rules && Object.keys(setting.validation_rules).length > 0 && (
                                    <div className="text-xs text-gray-500">
                                      <Info className="h-3 w-3 inline mr-1" />
                                      {setting.validation_rules.min && `Min: ${setting.validation_rules.min} `}
                                      {setting.validation_rules.max && `Max: ${setting.validation_rules.max} `}
                                      {setting.validation_rules.required && 'Required '}
                                      {setting.validation_rules.pattern && 'Format validation required'}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {isChanged && (
                                  <button
                                    onClick={() => saveSetting(category, setting)}
                                    disabled={saving}
                                    className="flex items-center px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
                                  >
                                    <Save className="h-3 w-3 mr-1" />
                                    Save
                                  </button>
                                )}
                                <button
                                  onClick={() => resetSetting(category, setting)}
                                  disabled={saving}
                                  className="flex items-center px-3 py-1 text-sm text-pink-600 hover:text-rose-900 border border-pink-300 rounded hover:bg-pink-50 disabled:opacity-50"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Reset
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Audit Trail Modal */}
      {showAuditTrail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-rose-900">Settings Audit Trail</h3>
              <button
                onClick={() => setShowAuditTrail(false)}
                className="text-pink-500 hover:text-pink-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-96">
              {auditTrail.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No audit records found</p>
              ) : (
                <div className="space-y-4">
                  {auditTrail.map((entry, index) => (
                    <div key={index} className="border border-pink-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-rose-900">
                          {entry.category} - {entry.setting_key}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(entry.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-sm text-pink-600 mb-1">
                        Reason: {entry.change_reason}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-red-600">Old Value:</span>
                          <pre className="mt-1 bg-red-50 p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(entry.old_value, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <span className="font-medium text-green-600">New Value:</span>
                          <pre className="mt-1 bg-green-50 p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(entry.new_value, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminSettings