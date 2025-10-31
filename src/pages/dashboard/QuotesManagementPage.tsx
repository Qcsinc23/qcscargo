import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { ShippingQuote } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AuthLayout } from '@/components/layout/AuthLayout'
import {
  FileText,
  Download,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Mail,
  Search,
  Filter,
  ArrowRight
} from 'lucide-react'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'

export default function QuotesManagementPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [quotes, setQuotes] = useState<ShippingQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'won' | 'lost' | 'expired'>('all')

  useEffect(() => {
    loadQuotes()
  }, [])

  const loadQuotes = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: quotesError } = await supabase
        .from('shipping_quotes')
        .select('*')
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false })

      if (quotesError) {
        throw quotesError
      }

      setQuotes(data || [])
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      logger.error('Error loading quotes', error, {
        component: 'QuotesManagementPage',
        action: 'loadQuotes'
      })
      setError(error.message || 'Failed to load quotes')
      toast.error('Failed to load quotes')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  const isExpiringSoon = (expiresAt: string) => {
    const expires = new Date(expiresAt)
    const now = new Date()
    const hoursUntilExpiry = (expires.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursUntilExpiry > 0 && hoursUntilExpiry <= 48
  }

  const getQuoteStatus = (quote: ShippingQuote) => {
    if (isExpired(quote.quote_expires_at)) return 'expired'
    return quote.status || 'pending'
  }

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = searchTerm === '' || 
      quote.quote_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const status = getQuoteStatus(quote)
    const matchesFilter = statusFilter === 'all' || status === statusFilter

    return matchesSearch && matchesFilter
  })

  const handleConvertToShipment = (quote: ShippingQuote) => {
    // Navigate to create shipment with quote data
    const params = new URLSearchParams({
      destination_id: quote.destination_id.toString(),
      weight: quote.weight_lbs.toString(),
      service_type: quote.service_type,
      declared_value: quote.declared_value?.toString() || '0',
      ...(quote.length_inches && { length: quote.length_inches.toString() }),
      ...(quote.width_inches && { width: quote.width_inches.toString() }),
      ...(quote.height_inches && { height: quote.height_inches.toString() })
    })
    navigate(`/dashboard/create-shipment?${params.toString()}`)
  }

  const handleDownloadQuote = (quote: ShippingQuote) => {
    if (quote.quote_document_html) {
      const blob = new Blob([quote.quote_document_html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${quote.quote_reference || 'quote'}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Quote downloaded')
    } else {
      toast.error('Quote document not available')
    }
  }

  if (loading) {
    return (
      <AuthLayout showTabs>
        <div className="min-h-screen bg-white p-6">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout showTabs>
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">My Quotes</h1>
                <p className="text-sm text-slate-600 mt-1">View and manage your shipping quotes</p>
              </div>
            </div>
            <Link to="/shipping-calculator">
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                Get New Quote
              </Button>
            </Link>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <div className="flex items-center">
                <XCircle className="h-4 w-4 mr-2" />
                {error}
              </div>
            </div>
          )}

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by quote reference or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={statusFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={statusFilter === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('pending')}
                  >
                    Pending
                  </Button>
                  <Button
                    variant={statusFilter === 'won' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('won')}
                  >
                    Accepted
                  </Button>
                  <Button
                    variant={statusFilter === 'expired' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('expired')}
                  >
                    Expired
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quotes List */}
          {filteredQuotes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {quotes.length === 0 ? 'No Quotes Yet' : 'No Quotes Match Your Filters'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {quotes.length === 0
                    ? 'Get your first shipping quote using our calculator'
                    : 'Try adjusting your search or filter criteria'}
                </p>
                <Link to="/shipping-calculator">
                  <Button>
                    <FileText className="h-4 w-4 mr-2" />
                    Get Quote
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredQuotes.map((quote) => {
                const status = getQuoteStatus(quote)
                const expired = isExpired(quote.quote_expires_at)
                const expiringSoon = isExpiringSoon(quote.quote_expires_at)
                const destination = quote.quote_metadata?.destination
                  ? `${quote.quote_metadata.destination.city || ''}, ${quote.quote_metadata.destination.country || ''}`.replace(/^,\s*|,\s*$/g, '')
                  : 'Destination TBD'

                return (
                  <Card key={quote.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <CardTitle className="text-lg">{quote.quote_reference || `Quote #${quote.id}`}</CardTitle>
                            <Badge
                              variant="outline"
                              className={
                                expired
                                  ? 'text-slate-600 border-slate-300 bg-slate-50'
                                  : status === 'won'
                                  ? 'text-green-600 border-green-200 bg-green-50'
                                  : status === 'lost'
                                  ? 'text-red-600 border-red-200 bg-red-50'
                                  : 'text-violet-600 border-violet-200 bg-violet-50'
                              }
                            >
                              {expired ? 'Expired' : status}
                            </Badge>
                            {expiringSoon && !expired && (
                              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                                <Clock className="h-3 w-3 mr-1" />
                                Expiring Soon
                              </Badge>
                            )}
                          </div>
                          <CardDescription>
                            Created {formatDate(quote.created_at)} • Expires {formatDate(quote.quote_expires_at)}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-slate-900">
                            {formatCurrency(quote.total_cost)}
                          </div>
                          <div className="text-sm text-slate-500">
                            {quote.service_type === 'express' ? 'Express' : 'Standard'} Service
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-slate-600 mb-1">Destination</div>
                          <div className="font-medium text-slate-900">{destination}</div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-600 mb-1">Weight</div>
                          <div className="font-medium text-slate-900">{quote.weight_lbs} lbs</div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-600 mb-1">Transit Time</div>
                          <div className="font-medium text-slate-900">
                            {quote.estimated_transit_days ? `${quote.estimated_transit_days} days` : 'TBD'}
                          </div>
                        </div>
                      </div>

                      {quote.quote_metadata?.transit_label && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                          <div className="text-sm text-blue-800">
                            <strong>Route:</strong> {quote.quote_metadata.transit_label}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-4 border-t">
                        {!expired && status === 'pending' && (
                          <Button
                            onClick={() => handleConvertToShipment(quote)}
                            className="flex-1 md:flex-none"
                          >
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Create Shipment
                          </Button>
                        )}
                        {quote.quote_document_html && (
                          <Button
                            variant="outline"
                            onClick={() => handleDownloadQuote(quote)}
                            className="flex-1 md:flex-none"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Quote
                          </Button>
                        )}
                        <Link to="/booking" className="flex-1 md:flex-none">
                          <Button variant="outline" className="w-full">
                            <Calendar className="h-4 w-4 mr-2" />
                            Schedule Booking
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AuthLayout>
  )
}

