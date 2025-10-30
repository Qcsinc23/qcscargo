import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ShippingQuote } from '@/lib/types'
import { AlertCircle, Loader2, Check, Clock, Filter, MailCheck, RefreshCcw, Search, Send, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  won: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  lost: 'bg-rose-100 text-rose-700 border border-rose-200',
  expired: 'bg-slate-100 text-slate-700 border border-slate-200',
  followup: 'bg-indigo-100 text-indigo-700 border border-indigo-200'
}

const followUpStatusColors: Record<string, string> = {
  scheduled: 'bg-sky-100 text-sky-700 border border-sky-200',
  pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  completed: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  failed: 'bg-rose-100 text-rose-700 border border-rose-200'
}

const AdminQuoteManagement: React.FC = () => {
  const [quotes, setQuotes] = useState<ShippingQuote[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'won' | 'lost' | 'expired'>('all')
  const [followUpFilter, setFollowUpFilter] = useState<'all' | 'due' | 'completed'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [processingIds, setProcessingIds] = useState<number[]>([])

  // Stateful fallback tracking: Remember if RLS has failed before
  const [hasRlsFailed, setHasRlsFailed] = useState(() => {
    const stored = localStorage.getItem('admin_quotes_rls_failed')
    return stored === 'true'
  })

  useEffect(() => {
    loadQuotes()
  }, [])

  const loadQuotes = async () => {
    try {
      setLoading(true)
      setError(null)

      // If RLS has failed before, skip direct query and use service-role function immediately
      if (hasRlsFailed) {
        console.log('Previous RLS failure detected, using service-role function')
        await loadQuotesViaFunction()
        return
      }

      // Try direct query first
      const { data, error } = await supabase
        .from('shipping_quotes')
        .select('*')
        .order('created_at', { ascending: false })

      // Detect RLS denial or permission errors
      const isRlsDenial = error && (
        error.message?.toLowerCase().includes('permission denied') ||
        error.message?.toLowerCase().includes('rls') ||
        error.message?.toLowerCase().includes('policy') ||
        error.code === 'PGRST301' || // PostgREST permission denied
        error.code === '42501' // PostgreSQL insufficient privilege
      )

      if (isRlsDenial) {
        console.warn('RLS denial detected, falling back to service-role function:', error)

        // Mark RLS as failed and persist to localStorage
        setHasRlsFailed(true)
        localStorage.setItem('admin_quotes_rls_failed', 'true')

        // Retry with service-role function
        await loadQuotesViaFunction()
        return
      }

      if (error) {
        throw error
      }

      setQuotes((data as ShippingQuote[]) || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load quotes'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const loadQuotesViaFunction = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-quotes-list', {
        method: 'POST'
      })

      if (error) {
        throw new Error(error.message || 'Failed to fetch quotes via service-role')
      }

      if (!data || !data.success) {
        throw new Error('Invalid response from quotes service')
      }

      setQuotes((data.data as ShippingQuote[]) || [])
      console.log(`Successfully loaded ${data.count || 0} quotes via service-role function`)
    } catch (err) {
      // If service-role function fails, this is a real error
      throw err
    }
  }

  const filteredQuotes = useMemo(() => {
    const now = new Date()
    return quotes.filter((quote) => {
      const matchesStatus =
        statusFilter === 'all' ||
        quote.status === statusFilter ||
        (statusFilter === 'expired' && new Date(quote.quote_expires_at) < now)

      const followUpDue = quote.follow_up_due_at ? new Date(quote.follow_up_due_at) <= now : false
      const matchesFollowUp =
        followUpFilter === 'all' ||
        (followUpFilter === 'due' && followUpDue && quote.follow_up_status !== 'completed') ||
        (followUpFilter === 'completed' && quote.follow_up_status === 'completed')

      const term = searchTerm.trim().toLowerCase()
      const matchesSearch =
        !term ||
        [
          quote.full_name,
          quote.email,
          quote.quote_reference,
          quote.quote_metadata?.destination?.country,
          quote.quote_metadata?.destination?.city
        ]
          .filter(Boolean)
          .some((value) => value?.toString().toLowerCase().includes(term))

      return matchesStatus && matchesFollowUp && matchesSearch
    })
  }, [quotes, statusFilter, followUpFilter, searchTerm])

  const dueFollowUps = useMemo(() => {
    const now = new Date()
    return quotes.filter((quote) => {
      if (quote.follow_up_status === 'completed') return false
      if (!quote.follow_up_due_at) return false
      return new Date(quote.follow_up_due_at) <= now
    })
  }, [quotes])

  const conversionRate = useMemo(() => {
    if (!quotes.length) return '0%'
    const won = quotes.filter((quote) => quote.status === 'won').length
    return `${Math.round((won / quotes.length) * 100)}%`
  }, [quotes])

  const handleUpdateStatus = async (quote: ShippingQuote, status: string) => {
    try {
      setProcessingIds((ids) => [...ids, quote.id])
      const { error } = await supabase
        .from('shipping_quotes')
        .update({ status })
        .eq('id', quote.id)

      if (error) throw error
      toast.success(`Quote ${quote.quote_reference || quote.id} updated to ${status}.`)
      await loadQuotes()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update status'
      toast.error(message)
    } finally {
      setProcessingIds((ids) => ids.filter((id) => id !== quote.id))
    }
  }

  const handleSendFollowUp = async (quote: ShippingQuote) => {
    try {
      setProcessingIds((ids) => [...ids, quote.id])
      const { data, error } = await supabase.functions.invoke('quote-follow-up', {
        body: {
          quoteId: quote.id,
          autoProcess: false
        }
      })
      if (error) throw new Error(error.message)
      const result = data?.data?.results?.[0]
      if (result?.status === 'sent') {
        toast.success(`Follow-up email sent for ${quote.quote_reference || quote.id}.`)
      } else {
        toast.warning(`Unable to confirm follow-up for ${quote.quote_reference || quote.id}.`)
      }
      await loadQuotes()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send follow-up email'
      toast.error(message)
    } finally {
      setProcessingIds((ids) => ids.filter((id) => id !== quote.id))
    }
  }

  const handleProcessDueFollowUps = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.functions.invoke('quote-follow-up', {
        body: {
          autoProcess: true
        }
      })
      if (error) throw new Error(error.message)
      const processed = data?.data?.processed || 0
      toast.success(`Processed ${processed} scheduled follow-up${processed === 1 ? '' : 's'}.`)
      await loadQuotes()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process follow-ups'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quotation Pipeline</h1>
          <p className="text-sm text-slate-500">Track quote requests, automate follow-ups, and convert customers to booked shipments.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadQuotes}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" /> Refresh
          </button>
          <button
            onClick={handleProcessDueFollowUps}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Processing…
              </>
            ) : (
              <>
                <MailCheck className="h-4 w-4" /> Run follow-up automation
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Open quotes</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{quotes.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Follow-ups due</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">{dueFollowUps.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Conversion rate</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">{conversionRate}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Expiring in 48h</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600">
            {
              quotes.filter((quote) => {
                const expires = new Date(quote.quote_expires_at)
                const now = new Date()
                const in48 = new Date(now.getTime() + 48 * 60 * 60 * 1000)
                return expires >= now && expires <= in48
              }).length
            }
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Search by customer, email, destination, or reference"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="bg-transparent text-sm outline-none"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="won">Converted</option>
                <option value="lost">Closed - Lost</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <Clock className="h-4 w-4 text-slate-400" />
              <select
                value={followUpFilter}
                onChange={(e) => setFollowUpFilter(e.target.value as typeof followUpFilter)}
                className="bg-transparent text-sm outline-none"
              >
                <option value="all">All follow-ups</option>
                <option value="due">Follow-up due</option>
                <option value="completed">Follow-up sent</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="border-b border-slate-100 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-10 text-slate-500">
              <Loader />
            </div>
          ) : filteredQuotes.length ? (
            <ul className="divide-y divide-slate-100">
              {filteredQuotes.map((quote) => {
                const expiresSoon = new Date(quote.quote_expires_at).getTime() < Date.now() + 48 * 3600 * 1000
                const followUpDue = quote.follow_up_due_at && new Date(quote.follow_up_due_at) <= new Date()
                const destinationLabel = quote.quote_metadata?.destination
                  ? [quote.quote_metadata.destination.city, quote.quote_metadata.destination.country].filter(Boolean).join(', ')
                  : 'Destination pending'

                  return (
                    <li
                      key={quote.id}
                      className={`grid gap-4 p-4 md:grid-cols-[1.2fr,1fr,1fr] md:items-center ${
                        quote.quote_metadata?.calculation_flagged ? 'bg-amber-50/60' : ''
                      }`}
                    >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {quote.full_name}
                        </p>
                          {quote.quote_reference && (
                            <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-medium text-slate-600">
                              {quote.quote_reference}
                            </span>
                          )}
                          {quote.quote_metadata?.calculation_flagged && (
                            <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-700">
                              Needs review
                            </span>
                          )}
                        </div>
                      <p className="text-xs text-slate-500">{quote.email}</p>
                      <p className="mt-2 text-sm text-slate-600">
                        {destinationLabel}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">Created {formatDate(quote.created_at)}</p>
                    </div>

                    <div className="space-y-1 text-sm text-slate-600">
                        <div className="flex items-center justify-between">
                          <span>Total</span>
                          <span className="font-medium text-slate-900">{formatCurrency(quote.total_cost)}</span>
                        </div>
                        {quote.quote_metadata?.rate_breakdown?.ratePerLb && (
                          <div className="flex items-center justify-between">
                            <span>Rate / lb</span>
                            <span className="text-slate-700">
                              {formatCurrency(quote.quote_metadata.rate_breakdown.ratePerLb)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span>Expires</span>
                          <span className={`font-medium ${expiresSoon ? 'text-rose-600' : 'text-slate-700'}`}>
                            {formatDate(quote.quote_expires_at)}
                          </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Status</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[quote.status] || 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                          {quote.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Follow-up</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${followUpStatusColors[quote.follow_up_status || 'pending'] || 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                          {quote.follow_up_status || 'pending'}
                        </span>
                      </div>
                      {quote.follow_up_due_at && (
                        <p className={`text-xs ${followUpDue ? 'text-amber-600' : 'text-slate-400'}`}>
                          Due {formatDate(quote.follow_up_due_at)}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleSendFollowUp(quote)}
                        disabled={processingIds.includes(quote.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" /> Follow-up
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(quote, 'won')}
                        disabled={processingIds.includes(quote.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" /> Mark won
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(quote, 'lost')}
                        disabled={processingIds.includes(quote.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      >
                        <ShieldAlert className="h-4 w-4" /> Close lost
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
              <MailCheck className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No quotes found for the selected filters.</p>
              <p className="text-xs text-slate-400">New email quotes will appear here automatically once customers submit requests.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const Loader: React.FC = () => (
  <div className="flex items-center gap-2 text-sm text-slate-500">
    <RefreshCcw className="h-4 w-4 animate-spin" /> Loading quotations…
  </div>
)

export default AdminQuoteManagement
