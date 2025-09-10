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
  RefreshCw,
  Clock,
  Calendar,
  Plus,
  Trash2,
  Filter,
  FileText,
  Shield,
  Globe,
  Zap
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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

interface BusinessHour {
  id: number
  day_of_week: number | null
  specific_date: string | null
  open_time: string | null
  close_time: string | null
  is_closed: boolean
  is_holiday: boolean
  holiday_name: string | null
  notes: string | null
}

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
]

const AdminSettings: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Business', 'Business Hours']))
  const [showAuditTrail, setShowAuditTrail] = useState(false)
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([])
  const [changedSettings, setChangedSettings] = useState<Set<string>>(new Set())
  const [settingValues, setSettingValues] = useState<Record<string, any>>({})
  const [showSensitive, setShowSensitive] = useState<Set<string>>(new Set())
  
  // Business Hours state
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([])
  const [holidays, setHolidays] = useState<BusinessHour[]>([])
  const [businessHoursLoading, setBusinessHoursLoading] = useState(false)
  const [newHoliday, setNewHoliday] = useState({
    date: '',
    name: '',
    is_closed: true,
    open_time: '',
    close_time: ''
  })

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

  // Business Hours Functions
  const loadBusinessHours = async () => {
    try {
      setBusinessHoursLoading(true)

      // Load regular business hours (by day of week)
      const { data: regularHours, error: regularError } = await supabase
        .from('business_hours')
        .select('*')
        .is('specific_date', null)
        .order('day_of_week')

      if (regularError) throw regularError

      // Load holidays and special dates
      const { data: specialDates, error: specialError } = await supabase
        .from('business_hours')
        .select('*')
        .not('specific_date', 'is', null)
        .order('specific_date')

      if (specialError) throw specialError

      setBusinessHours(regularHours || [])
      setHolidays(specialDates || [])

    } catch (err: any) {
      console.error('Error loading business hours:', err)
      toast.error('Failed to load business hours: ' + err.message)
    } finally {
      setBusinessHoursLoading(false)
    }
  }

  const updateRegularHours = async (dayOfWeek: number, field: string, value: any) => {
    try {
      const existingHour = businessHours.find(h => h.day_of_week === dayOfWeek)
      
      if (existingHour) {
        // Update existing
        const { error } = await supabase
          .from('business_hours')
          .update({ [field]: value, updated_at: new Date().toISOString() })
          .eq('id', existingHour.id)

        if (error) throw error

        setBusinessHours(prev => prev.map(h => 
          h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h
        ))
      } else {
        // Create new
        const { data, error } = await supabase
          .from('business_hours')
          .insert({
            day_of_week: dayOfWeek,
            [field]: value,
            is_closed: field === 'is_closed' ? value : false
          })
          .select()
          .single()

        if (error) throw error

        setBusinessHours(prev => [...prev, data])
      }

      toast.success('Hours updated successfully')
    } catch (err: any) {
      console.error('Error updating hours:', err)
      toast.error('Failed to update hours: ' + err.message)
    }
  }

  const addHoliday = async () => {
    try {
      if (!newHoliday.date || !newHoliday.name) {
        toast.error('Please fill in date and holiday name')
        return
      }

      const holidayData = {
        specific_date: newHoliday.date,
        holiday_name: newHoliday.name,
        is_closed: newHoliday.is_closed,
        is_holiday: true,
        open_time: newHoliday.is_closed ? null : newHoliday.open_time || null,
        close_time: newHoliday.is_closed ? null : newHoliday.close_time || null
      }

      const { data, error } = await supabase
        .from('business_hours')
        .insert(holidayData)
        .select()
        .single()

      if (error) throw error

      setHolidays(prev => [...prev, data].sort((a, b) => 
        new Date(a.specific_date!).getTime() - new Date(b.specific_date!).getTime()
      ))

      setNewHoliday({
        date: '',
        name: '',
        is_closed: true,
        open_time: '',
        close_time: ''
      })

      toast.success('Holiday added successfully')
    } catch (err: any) {
      console.error('Error adding holiday:', err)
      toast.error('Failed to add holiday: ' + err.message)
    }
  }

  const deleteHoliday = async (id: number) => {
    try {
      const { error } = await supabase
        .from('business_hours')
        .delete()
        .eq('id', id)

      if (error) throw error

      setHolidays(prev => prev.filter(h => h.id !== id))
      toast.success('Holiday deleted successfully')
    } catch (err: any) {
      console.error('Error deleting holiday:', err)
      toast.error('Failed to delete holiday: ' + err.message)
    }
  }

  const formatTime = (time: string | null) => {
    if (!time) return ''
    return time.slice(0, 5) // HH:MM format
  }

  const getHoursForDay = (dayOfWeek: number) => {
    return businessHours.find(h => h.day_of_week === dayOfWeek) || {
      id: 0,
      day_of_week: dayOfWeek,
      specific_date: null,
      open_time: '09:00',
      close_time: '18:00',
      is_closed: dayOfWeek === 0, // Sunday closed by default
      is_holiday: false,
      holiday_name: null,
      notes: null
    }
  }

  // Load business hours when component mounts
  useEffect(() => {
    loadBusinessHours()
  }, [])

  const renderSettingInput = (category: string, setting: Setting) => {
    const key = `${category}::${setting.setting_key}`
    const value = settingValues[key]
    const isChanged = changedSettings.has(key)
    const isSensitive = setting.input_type === 'password' || setting.setting_key.toLowerCase().includes('key') || setting.setting_key.toLowerCase().includes('secret')
    const showValue = !isSensitive || showSensitive.has(key)

    const commonProps = {
      className: `w-full ${isChanged ? 'ring-2 ring-primary/20 border-primary bg-primary/5' : ''}`,
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
              className="w-4 h-4 text-primary border-input rounded focus:ring-primary"
            />
            <span className="text-sm text-muted-foreground">
              {value === true || value === 'true' ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        )

      case 'number':
        return (
          <Input
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
            className={`w-full px-3 py-2 border border-input rounded-md bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${isChanged ? 'ring-2 ring-primary/20 border-primary bg-primary/5' : ''}`}
            onChange={(e) => handleSettingChange(category, setting.setting_key, e.target.value)}
          />
        )

      case 'select':
        return (
          <Select value={value || ''} onValueChange={(newValue) => handleSettingChange(category, setting.setting_key, newValue)}>
            <SelectTrigger className={isChanged ? 'ring-2 ring-primary/20 border-primary bg-primary/5' : ''}>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {setting.validation_rules?.options?.map((option: any) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'password':
        return (
          <div className="relative">
            <Input
              type={showValue ? 'text' : 'password'}
              value={value || ''}
              {...commonProps}
              className={`pr-10 ${commonProps.className}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => toggleSensitiveVisibility(key)}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            >
              {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        )

      case 'json':
        return (
          <textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            rows={4}
            className={`w-full px-3 py-2 border border-input rounded-md bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono ${isChanged ? 'ring-2 ring-primary/20 border-primary bg-primary/5' : ''}`}
            placeholder="Enter valid JSON"
            onChange={(e) => handleSettingChange(category, setting.setting_key, e.target.value)}
          />
        )

      default:
        return (
          <div className="relative">
            <Input
              type={setting.input_type === 'email' ? 'email' : setting.input_type === 'url' ? 'url' : 'text'}
              value={isSensitive && !showValue ? '••••••••••••' : (value || '')}
              {...commonProps}
              className={`${isSensitive ? 'pr-10' : ''} ${commonProps.className}`}
              readOnly={isSensitive && !showValue}
            />
            {isSensitive && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => toggleSensitiveVisibility(key)}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              >
                {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
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
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search settings by name, key, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory('all')
                }}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Hours Management Section */}
      <Card className="mb-6">
        <CardHeader
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleCategory('Business Hours')}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center text-xl">
                <Clock className="h-5 w-5 mr-3 text-primary" />
                Business Hours Management
              </CardTitle>
              <CardDescription className="mt-2">
                Configure operating hours and holiday schedules
              </CardDescription>
            </div>
            {expandedCategories.has('Business Hours') ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>

        {expandedCategories.has('Business Hours') && (
          <CardContent className="space-y-6">
            {/* Regular Business Hours */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 pb-2 border-b">
                Regular Operating Hours
              </h3>
              {businessHoursLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-3 text-muted-foreground">Loading business hours...</span>
                </div>
              ) : (
                <div className="grid gap-4">
                  {DAYS_OF_WEEK.map((dayName, dayIndex) => {
                    const hours = getHoursForDay(dayIndex)
                    return (
                      <Card key={dayIndex} className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="w-20 font-medium text-foreground">
                            {dayName}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={hours.is_closed}
                              onChange={(e) => updateRegularHours(dayIndex, 'is_closed', e.target.checked)}
                              className="rounded border-input text-primary focus:ring-primary"
                            />
                            <label className="text-sm text-muted-foreground">Closed</label>
                          </div>

                          {!hours.is_closed && (
                            <div className="flex flex-col sm:flex-row gap-4">
                              <div className="flex items-center space-x-2">
                                <label className="text-sm text-muted-foreground min-w-[3rem]">Open:</label>
                                <Input
                                  type="time"
                                  value={formatTime(hours.open_time)}
                                  onChange={(e) => updateRegularHours(dayIndex, 'open_time', e.target.value)}
                                  className="w-32"
                                />
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <label className="text-sm text-muted-foreground min-w-[3rem]">Close:</label>
                                <Input
                                  type="time"
                                  value={formatTime(hours.close_time)}
                                  onChange={(e) => updateRegularHours(dayIndex, 'close_time', e.target.value)}
                                  className="w-32"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Holidays and Special Dates */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 pb-2 border-b flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-primary" />
                Holidays & Special Dates
              </h3>
              
              {/* Add New Holiday */}
              <Card className="mb-6 bg-muted/30">
                <CardContent className="pt-6">
                  <h4 className="font-semibold text-foreground mb-4">Add New Holiday/Special Date</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Date</label>
                      <Input
                        type="date"
                        value={newHoliday.date}
                        onChange={(e) => setNewHoliday(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Holiday Name</label>
                      <Input
                        type="text"
                        placeholder="e.g., Christmas Day"
                        value={newHoliday.name}
                        onChange={(e) => setNewHoliday(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2 pt-6">
                      <input
                        type="checkbox"
                        checked={newHoliday.is_closed}
                        onChange={(e) => setNewHoliday(prev => ({ ...prev, is_closed: e.target.checked }))}
                        className="rounded border-input text-primary focus:ring-primary"
                      />
                      <label className="text-sm text-muted-foreground">Closed</label>
                    </div>
                    
                    {!newHoliday.is_closed && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-2">Open Time</label>
                          <Input
                            type="time"
                            value={newHoliday.open_time}
                            onChange={(e) => setNewHoliday(prev => ({ ...prev, open_time: e.target.value }))}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-2">Close Time</label>
                          <Input
                            type="time"
                            value={newHoliday.close_time}
                            onChange={(e) => setNewHoliday(prev => ({ ...prev, close_time: e.target.value }))}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  
                  <Button
                    onClick={addHoliday}
                    className="mt-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Holiday
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Holidays */}
              <div className="space-y-3">
                {holidays.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No holidays or special dates configured</p>
                ) : (
                  holidays.map((holiday) => (
                    <Card key={holiday.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="font-medium text-foreground">
                              {new Date(holiday.specific_date!).toLocaleDateString()}
                            </div>
                            <div className="text-muted-foreground">{holiday.holiday_name}</div>
                            {holiday.is_closed ? (
                              <Badge variant="destructive">
                                Closed
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                {formatTime(holiday.open_time)} - {formatTime(holiday.close_time)}
                              </Badge>
                            )}
                          </div>
                          
                          <Button
                            onClick={() => deleteHoliday(holiday.id)}
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/20 hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Settings Content */}
      <div className="space-y-6">
        {settings && Object.entries(settings.settings).map(([category, subcategories]) => (
          <Card key={category}>
            {/* Category Header */}
            <CardHeader
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleCategory(category)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center text-xl">
                    {category === 'Business' && <Shield className="h-5 w-5 mr-3 text-primary" />}
                    {category === 'System' && <Settings className="h-5 w-5 mr-3 text-primary" />}
                    {category === 'API' && <Globe className="h-5 w-5 mr-3 text-primary" />}
                    {category === 'Performance' && <Zap className="h-5 w-5 mr-3 text-primary" />}
                    {!['Business', 'System', 'API', 'Performance'].includes(category) && <FileText className="h-5 w-5 mr-3 text-primary" />}
                    {category}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {Object.values(subcategories).reduce((total, settings) => total + settings.length, 0)} settings available
                  </CardDescription>
                </div>
                {expandedCategories.has(category) ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>

            {/* Category Content */}
            {expandedCategories.has(category) && (
              <CardContent className="space-y-6">
                {Object.entries(subcategories).map(([subcategory, settingsList]) => (
                  <div key={subcategory}>
                    {subcategory !== 'General' && (
                      <h3 className="text-lg font-semibold text-foreground mb-4 pb-2 border-b">
                        {subcategory}
                      </h3>
                    )}
                    <div className="grid gap-4">
                      {settingsList.map((setting: Setting) => {
                        const key = `${category}::${setting.setting_key}`
                        const isChanged = changedSettings.has(key)
                        
                        return (
                          <Card key={setting.id} className={`transition-all ${isChanged ? 'ring-2 ring-primary/20 border-primary/30' : ''}`}>
                            <CardContent className="pt-6">
                              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <label className="text-sm font-semibold text-foreground">
                                      {setting.display_name}
                                    </label>
                                    {setting.is_system_critical && (
                                      <Badge variant="destructive">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Critical
                                      </Badge>
                                    )}
                                    {setting.affects_operations && (
                                      <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50">
                                        <Zap className="h-3 w-3 mr-1" />
                                        Operations
                                      </Badge>
                                    )}
                                    {setting.is_public && (
                                      <Badge variant="secondary">
                                        <Globe className="h-3 w-3 mr-1" />
                                        Public
                                      </Badge>
                                    )}
                                  </div>
                                  {setting.description && (
                                    <p className="text-sm text-muted-foreground mb-4">{setting.description}</p>
                                  )}
                                  <div className="space-y-2">
                                    {renderSettingInput(category, setting)}
                                    {setting.validation_rules && Object.keys(setting.validation_rules).length > 0 && (
                                      <div className="text-xs text-muted-foreground flex items-center">
                                        <Info className="h-3 w-3 mr-1" />
                                        {setting.validation_rules.min && `Min: ${setting.validation_rules.min} `}
                                        {setting.validation_rules.max && `Max: ${setting.validation_rules.max} `}
                                        {setting.validation_rules.required && 'Required '}
                                        {setting.validation_rules.pattern && 'Format validation required'}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isChanged && (
                                    <Button
                                      onClick={() => saveSetting(category, setting)}
                                      disabled={saving}
                                      size="sm"
                                    >
                                      <Save className="h-3 w-3 mr-1" />
                                      Save
                                    </Button>
                                  )}
                                  <Button
                                    onClick={() => resetSetting(category, setting)}
                                    disabled={saving}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <RotateCcw className="h-3 w-3 mr-1" />
                                    Reset
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Audit Trail Modal */}
      {showAuditTrail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center">
                <History className="h-5 w-5 mr-2 text-primary" />
                Settings Audit Trail
              </CardTitle>
              <Button
                onClick={() => setShowAuditTrail(false)}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-96">
              {auditTrail.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No audit records found</p>
              ) : (
                <div className="space-y-4">
                  {auditTrail.map((entry, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-semibold text-foreground">
                            {entry.category} - {entry.setting_key}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(entry.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground mb-3">
                          <strong>Reason:</strong> {entry.change_reason}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-destructive">Old Value:</span>
                            <pre className="mt-2 bg-destructive/5 border border-destructive/20 p-3 rounded text-xs overflow-x-auto font-mono">
                              {JSON.stringify(entry.old_value, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <span className="font-medium text-green-600">New Value:</span>
                            <pre className="mt-2 bg-green-50 border border-green-200 p-3 rounded text-xs overflow-x-auto font-mono">
                              {JSON.stringify(entry.new_value, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default AdminSettings
