import React, { useState, useEffect } from 'react'
import {
  Search,
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  Calendar,
  DollarSign,
  TrendingUp,
  Download,
  FileText,
  Filter,
  Star,
  AlertCircle,
  CheckCircle,
  Activity,
  BarChart3,
  Users,
  RefreshCw,
  Eye,
  ChevronRight,
  Clock,
  Building,
  Target,
  Zap
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface Customer {
  id: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone: string
  company_name: string
  contact_person: string
  city: string
  state: string
  country: string
  business_type: string
  profile_completion_percentage: number
  customer_since: string
  total_bookings: number
  confirmed_bookings: number
  cancelled_bookings: number
  last_booking_date: string | null
  days_since_last_booking: number | null
  customer_tier: string
  cancellation_rate: string
  is_active: boolean
}

interface CustomerAnalytics {
  total_bookings: number
  confirmed_bookings: number
  cancelled_bookings: number
  recent_bookings_30d: number
  recent_activity_30d?: number // Combined bookings + shipments in last 30 days
  total_shipments?: number // Total shipments count
  total_weight_shipped: number
  average_weight_per_booking: number
  preferred_service_type: string
  service_type_distribution: Record<string, number>
  booking_frequency: string
  cancellation_rate: number
  risk_score: number
  engagement_score: number
  customer_tier: string
  profile_completion: number
  days_since_last_booking: number | null
}

interface CustomerDetails {
  id: string
  profile: any
  bookings: any[]
  analytics: CustomerAnalytics
  behavior_patterns: any
  geographic_distribution: any
  summary: any
}

const AdminCustomerInsights: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'analytics' | 'behavior'>('overview')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    country: '',
    state: '',
    business_type: '',
    min_profile_completion: ''
  })
  const [exportLoading, setExportLoading] = useState(false)

  // Load customers on component mount and when search/filters change
  useEffect(() => {
    loadCustomers()
  }, [searchTerm, currentPage, filters])

  const loadCustomers = async () => {
    try {
      setLoading(true)
      
      const requestData = {
        search_term: searchTerm,
        page: currentPage,
        limit: 20,
        filters: Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      }

      console.log('Loading customers with request:', requestData)
      
      const { data, error } = await supabase.functions.invoke('admin-customer-list', {
        body: requestData
      })

      if (error) {
        throw new Error(error.message)
      }

      if (data?.error) {
        throw new Error(data.error.message)
      }

      const result = data?.data || data
      console.log('Customer list response:', result)
      
      // Ensure customers have proper name formatting
      const formattedCustomers = (result.customers || []).map((customer: any) => ({
        ...customer,
        // Ensure full_name is always set properly
        full_name: customer.full_name && customer.full_name !== 'N/A'
          ? customer.full_name
          : customer.first_name || customer.last_name
            ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email || 'Unknown'
            : customer.contact_person || customer.company_name || customer.email || 'Unknown',
        // Set first_name and last_name if missing
        first_name: customer.first_name || customer.contact_person?.split(' ')[0] || '',
        last_name: customer.last_name || customer.contact_person?.split(' ').slice(1).join(' ') || ''
      }))
      
      setCustomers(formattedCustomers)
      setTotalPages(result.pagination?.totalPages || 1)
      setTotalCustomers(result.pagination?.total || 0)
    } catch (err) {
      console.error('Error loading customers:', err)
      toast.error(`Failed to load customers: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const loadCustomerDetails = async (customerId: string) => {
    try {
      setDetailsLoading(true)
      
      const { data, error } = await supabase.functions.invoke('admin-customer-insights', {
        body: {
          customer_id: customerId,
          include_analytics: true,
          include_bookings: true
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      if (data?.error) {
        throw new Error(data.error.message)
      }

      const result = data?.data || data
      const customerDetails = result.customers?.[0]
      
      if (customerDetails) {
        setSelectedCustomer(customerDetails)
        setActiveTab('overview')
      } else {
        throw new Error('Customer not found')
      }
    } catch (err) {
      console.error('Error loading customer details:', err)
      toast.error(`Failed to load customer details: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const exportCustomerData = async (format: 'csv' | 'json', exportType: string = 'customer_list') => {
    try {
      setExportLoading(true)
      
      const requestData = {
        export_type: exportType,
        format: format,
        include_analytics: true,
        include_bookings: exportType === 'customer_bookings',
        filters: Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      }

      const { data, error } = await supabase.functions.invoke('admin-customer-export', {
        body: requestData
      })

      if (error) {
        throw new Error(error.message)
      }

      if (data?.error) {
        throw new Error(data.error.message)
      }

      // For CSV, the response should be a string
      if (format === 'csv') {
        const blob = new Blob([data], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${exportType}_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        // For JSON, create downloadable file
        const jsonData = JSON.stringify(data, null, 2)
        const blob = new Blob([jsonData], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${exportType}_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }

      toast.success(`Customer data exported successfully as ${format.toUpperCase()}`)
    } catch (err) {
      console.error('Error exporting customer data:', err)
      toast.error(`Failed to export customer data: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setExportLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      new: 'bg-gray-100 text-gray-800',
      regular: 'bg-blue-100 text-blue-800',
      premium: 'bg-purple-100 text-purple-800',
      vip: 'bg-yellow-100 text-yellow-800'
    }
    return colors[tier] || 'bg-gray-100 text-gray-800'
  }

  const getRiskColor = (score: number) => {
    if (score < 20) return 'bg-green-100 text-green-800'
    if (score < 50) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customer Insights</h1>
        <p className="text-gray-600 mt-1">360-degree customer view with behavioral analytics</p>
      </div>

      {/* Search and Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers by name, email, company..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Filter className="h-4 w-4 mr-2 inline" />
              Filters
            </button>
            
            <button
              onClick={loadCustomers}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 inline ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {/* Export Dropdown */}
            <div className="relative inline-block">
              <button
                onClick={() => exportCustomerData('csv')}
                disabled={exportLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                <Download className={`h-4 w-4 mr-2 inline ${exportLoading ? 'animate-spin' : ''}`} />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select
                  value={filters.country}
                  onChange={(e) => handleFilterChange('country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Countries</option>
                  <option value="United States">United States</option>
                  <option value="USA">USA</option>
                  <option value="Canada">Canada</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  placeholder="e.g., NY, NJ, CA"
                  value={filters.state}
                  onChange={(e) => handleFilterChange('state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                <input
                  type="text"
                  placeholder="e.g., logistics, retail"
                  value={filters.business_type}
                  onChange={(e) => handleFilterChange('business_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Profile %</label>
                <input
                  type="number"
                  placeholder="e.g., 50"
                  min="0"
                  max="100"
                  value={filters.min_profile_completion}
                  onChange={(e) => handleFilterChange('min_profile_completion', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Customers ({totalCustomers})</h2>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {customers.map((customer) => {
                    // Ensure we have a proper display name
                    const displayName = customer.full_name && customer.full_name !== 'N/A'
                      ? customer.full_name
                      : customer.email || 'Unknown Customer';
                    
                    const displayEmail = customer.email || 'No email';
                    
                    return (
                      <div
                        key={customer.id}
                        onClick={() => loadCustomerDetails(customer.id)}
                        className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedCustomer?.id === customer.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center">
                              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="h-4 w-4 text-blue-600" />
                              </div>
                              <div className="ml-3 flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {displayName}
                                </p>
                                <p className="text-sm text-gray-500 truncate">{displayEmail}</p>
                                {customer.company_name && (
                                  <p className="text-xs text-gray-400 truncate">{customer.company_name}</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center space-x-2 flex-wrap gap-1">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTierColor(customer.customer_tier)}`}>
                                  {customer.customer_tier}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {customer.total_bookings || 0} bookings
                                </span>
                                {(customer as any).total_shipments > 0 && (
                                  <span className="text-xs text-gray-500">
                                    {(customer as any).total_shipments} shipments
                                  </span>
                                )}
                              </div>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {customers.length === 0 && !loading && (
                    <div className="p-8 text-center text-gray-500">
                      <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <p>No customers found</p>
                      <p className="text-sm mt-1">Try adjusting your search or filters</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Customer Details */}
        <div className="lg:col-span-2">
          {selectedCustomer ? (
            <div className="space-y-6">
              {/* Customer Header */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                {detailsLoading ? (
                  <div className="animate-pulse">
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="ml-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                          {selectedCustomer.profile.first_name} {selectedCustomer.profile.last_name}
                        </h2>
                        <p className="text-gray-600">{selectedCustomer.profile.email}</p>
                        {selectedCustomer.profile.company_name && (
                          <p className="text-sm text-gray-500 mt-1">
                            <Building className="h-4 w-4 inline mr-1" />
                            {selectedCustomer.profile.company_name}
                          </p>
                        )}
                        <p className="text-sm text-gray-500 mt-1">
                          Customer since {formatDate(selectedCustomer.profile.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getRiskColor(selectedCustomer.analytics.risk_score)}`}>
                          {selectedCustomer.analytics.risk_score < 20 ? 'Low Risk' :
                           selectedCustomer.analytics.risk_score < 50 ? 'Medium Risk' : 'High Risk'}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Risk Score: {selectedCustomer.analytics.risk_score}</p>
                      </div>
                      <div className="text-center">
                        <div className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getTierColor(selectedCustomer.analytics.customer_tier)}`}>
                          {selectedCustomer.analytics.customer_tier}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Customer Tier</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Analytics Cards */}
              {selectedCustomer.analytics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow-sm border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{selectedCustomer.analytics.total_bookings}</p>
                        <p className="text-sm text-gray-500">{selectedCustomer.analytics.booking_frequency}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-50">
                        <Calendar className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Weight</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {Math.round(selectedCustomer.analytics.total_weight_shipped || 0).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">lbs shipped</p>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-50">
                        <Package className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Recent Activity</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {selectedCustomer.analytics.recent_activity_30d || selectedCustomer.analytics.recent_bookings_30d || 0}
                        </p>
                        <p className="text-sm text-gray-500">Last 30 days</p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-50">
                        <TrendingUp className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Engagement</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{selectedCustomer.analytics.engagement_score || 0}</p>
                        <p className="text-sm text-gray-500">Score</p>
                      </div>
                      <div className="p-3 rounded-lg bg-orange-50">
                        <Zap className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex">
                    {[
                      { key: 'overview', label: 'Overview', icon: Activity },
                      { key: 'bookings', label: 'Bookings', icon: Calendar },
                      { key: 'analytics', label: 'Analytics', icon: BarChart3 },
                      { key: 'behavior', label: 'Behavior', icon: Target }
                    ].map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => setActiveTab(key as any)}
                        className={`flex items-center px-6 py-3 border-b-2 font-medium text-sm ${
                          activeTab === key
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {label}
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="p-6">
                  {/* Overview Tab */}
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                        <div className="space-y-3">
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-3" />
                            <span className="text-sm text-gray-900">
                              {selectedCustomer.profile.full_name || 
                               `${selectedCustomer.profile.first_name || ''} ${selectedCustomer.profile.last_name || ''}`.trim() ||
                               selectedCustomer.profile.contact_person ||
                               selectedCustomer.profile.company_name ||
                               'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 text-gray-400 mr-3" />
                            <span className="text-sm text-gray-900">{selectedCustomer.profile.email || 'No email'}</span>
                          </div>
                          {selectedCustomer.profile.phone && (
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 text-gray-400 mr-3" />
                              <span className="text-sm text-gray-900">{selectedCustomer.profile.phone}</span>
                            </div>
                          )}
                          {selectedCustomer.profile.company_name && (
                            <div className="flex items-center">
                              <Building className="h-4 w-4 text-gray-400 mr-3" />
                              <span className="text-sm text-gray-900">{selectedCustomer.profile.company_name}</span>
                            </div>
                          )}
                          {(selectedCustomer.profile.city || selectedCustomer.profile.state) && (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 text-gray-400 mr-3" />
                              <span className="text-sm text-gray-900">
                                {[selectedCustomer.profile.city, selectedCustomer.profile.state].filter(Boolean).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                        
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Completion</h3>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Overall Progress</span>
                              <span className="text-sm font-medium text-gray-900">
                                {selectedCustomer.profile.profile_completion_percentage || 0}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${selectedCustomer.profile.profile_completion_percentage || 0}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500">
                              Complete profile for better service recommendations
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bookings Tab */}
                  {activeTab === 'bookings' && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Bookings</h3>
                      <div className="space-y-4">
                        {selectedCustomer.bookings?.map((booking) => (
                          <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <span className="text-sm font-medium text-gray-900">
                                    Booking #{booking.id.slice(-8)}
                                  </span>
                                  <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {booking.status}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {booking.address?.street}, {booking.address?.city}, {booking.address?.state}
                                </p>
                                <div className="flex items-center mt-2 space-x-4">
                                  <span className="text-xs text-gray-500">
                                    <Clock className="h-3 w-3 inline mr-1" />
                                    {formatDate(booking.window_start)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    <Package className="h-3 w-3 inline mr-1" />
                                    {booking.estimated_weight} lbs
                                  </span>
                                  <span className="text-xs text-gray-500 capitalize">
                                    {booking.service_type}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {(!selectedCustomer.bookings || selectedCustomer.bookings.length === 0) && (
                          <div className="text-center py-8 text-gray-500">
                            <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                            <p>No bookings found</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Analytics Tab */}
                  {activeTab === 'analytics' && selectedCustomer.analytics && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Activity Metrics</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Total Bookings</span>
                              <span className="text-sm font-medium">{selectedCustomer.analytics.total_bookings || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Total Shipments</span>
                              <span className="text-sm font-medium">{selectedCustomer.analytics.total_shipments || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Confirmed</span>
                              <span className="text-sm font-medium">{selectedCustomer.analytics.confirmed_bookings || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Cancelled</span>
                              <span className="text-sm font-medium">{selectedCustomer.analytics.cancelled_bookings || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Recent (30d)</span>
                              <span className="text-sm font-medium">{selectedCustomer.analytics.recent_activity_30d || selectedCustomer.analytics.recent_bookings_30d || 0}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Service Usage</h4>
                          <div className="space-y-2">
                            {Object.entries(selectedCustomer.analytics.service_type_distribution).map(([service, count]) => (
                              <div key={service} className="flex justify-between">
                                <span className="text-sm text-gray-600 capitalize">{service}</span>
                                <span className="text-sm font-medium">{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Performance</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Cancellation Rate</span>
                              <span className="text-sm font-medium">{selectedCustomer.analytics.cancellation_rate}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Avg Weight</span>
                              <span className="text-sm font-medium">{selectedCustomer.analytics.average_weight_per_booking} lbs</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Frequency</span>
                              <span className="text-sm font-medium capitalize">{selectedCustomer.analytics.booking_frequency}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Behavior Tab */}
                  {activeTab === 'behavior' && selectedCustomer.behavior_patterns && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Geographic Distribution</h4>
                          <div className="space-y-2">
                            {selectedCustomer.geographic_distribution?.top_zip_codes?.slice(0, 5).map((item: any, index: number) => (
                              <div key={index} className="flex justify-between">
                                <span className="text-sm text-gray-600">ZIP {item.zip_code}</span>
                                <span className="text-sm font-medium">{item.booking_count} bookings</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Booking Patterns</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Peak Booking Hour</span>
                              <span className="text-sm font-medium">
                                {Object.entries(selectedCustomer.behavior_patterns.peak_hours || {})
                                  .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'N/A'}:00
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Most Active Day</span>
                              <span className="text-sm font-medium">
                                {(() => {
                                  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
                                  const topDay = Object.entries(selectedCustomer.behavior_patterns.peak_days || {})
                                    .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0]
                                  return topDay ? days[parseInt(topDay)] : 'N/A'
                                })()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Service Evolution</span>
                              <span className="text-sm font-medium">
                                {selectedCustomer.behavior_patterns.service_evolution?.length || 0} data points
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
              <User className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Customer</h3>
              <p className="text-gray-600">Choose a customer from the list to view detailed insights and analytics</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminCustomerInsights