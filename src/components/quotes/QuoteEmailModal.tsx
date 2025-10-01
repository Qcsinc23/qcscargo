import React, { useEffect, useMemo, useState } from 'react'
import { CalculatedRate, ShippingCalculatorData } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { AlertCircle, CheckCircle2, Loader2, Mail, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface QuoteEmailModalProps {
  open: boolean
  onClose: () => void
  calculatedRate: CalculatedRate | null
  formData: ShippingCalculatorData
}

interface QuoteSubmissionResult {
  quoteReference: string
  expiresAt: string
  emailDispatched: boolean
  message: string
  totalCost: number
  estimatedTransitDays?: number
  calculationFlagged?: boolean
  billableWeight?: number
  dimensionalWeight?: number | null
  ratePerLb?: number
}

const TERMS: string[] = [
  'Liability limitations: QCS Cargo is not responsible for indirect, incidental, or consequential damages beyond the declared insurance coverage.',
  'Insurance requirements: Shipments valued over $2,500 require supplemental insurance documentation prior to tendering freight.',
  'Customs responsibilities: Consignees are responsible for providing accurate documentation and paying any duties, taxes, or customs-related fees upon arrival.',
  'Payment terms: Quotes are valid for seven (7) days and require payment in full prior to cargo departure unless otherwise agreed in writing.',
  'Cancellation policy: Bookings cancelled within 24 hours of scheduled departure may incur up to 50% of quoted charges.',
  'Dispute resolution: Any disputes will be handled in accordance with New Jersey state law and must be submitted in writing within 10 days of delivery notification.'
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

const QuoteEmailModal: React.FC<QuoteEmailModalProps> = ({ open, onClose, calculatedRate, formData }) => {
  const { user } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<QuoteSubmissionResult | null>(null)

  useEffect(() => {
    if (open) {
      setFullName(user?.user_metadata?.full_name || '')
      setEmail(user?.email || '')
      setPhone(user?.user_metadata?.phone || '')
      setNotes('')
      setAgreeTerms(false)
      setError(null)
      setResult(null)
      setLoading(false)
    }
  }, [open, user])

  const destinationSummary = useMemo(() => {
    if (!calculatedRate) return ''
    const parts = [calculatedRate.destination.city, calculatedRate.destination.country].filter(Boolean)
    return parts.join(', ')
  }, [calculatedRate])

  const transitSummary = useMemo(() => {
    if (!calculatedRate?.transitTime) return ''
    return calculatedRate.transitTime.estimate
  }, [calculatedRate])

  if (!open) return null

  const handleClose = () => {
    if (loading) return
    onClose()
  }

  const validateEmail = (value: string) => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return pattern.test(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!calculatedRate) {
      setError('Please calculate a rate before requesting an email quote.')
      return
    }

    if (!fullName.trim()) {
      setError('Please provide your full name.')
      return
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }

    if (!agreeTerms) {
      setError('Please confirm you have reviewed the quotation terms and conditions.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: functionError } = await supabase.functions.invoke('quote-request', {
        body: {
          customerInfo: {
            fullName,
            email,
            phone
          },
          destinationId: formData.destinationId,
          weight: formData.weight,
          dimensions: formData.dimensions,
          serviceType: formData.serviceType,
          declaredValue: formData.declaredValue,
          rateBreakdown: calculatedRate.rateBreakdown,
          specialInstructions: notes
        }
      })

      if (functionError) {
        throw new Error(functionError.message || 'Failed to submit quotation request.')
      }

      const payload = data?.data
      if (!payload) {
        throw new Error('Unexpected response from quotation service.')
      }

      setResult({
        quoteReference: payload.quoteReference,
        expiresAt: payload.expiresAt,
        emailDispatched: payload.emailDispatched,
        message: payload.message,
        totalCost: payload.totalCost,
        estimatedTransitDays: payload.estimatedTransitDays,
        calculationFlagged: payload.calculationFlagged,
        billableWeight: payload.billableWeight,
        dimensionalWeight: payload.dimensionalWeight,
        ratePerLb: payload.ratePerLb
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to process your request. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const expirationDate = result?.expiresAt ? new Date(result.expiresAt).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '7 days'

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 px-4 py-6 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl my-8">
        <button
          onClick={handleClose}
          disabled={loading}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Close quote modal"
        >
          <span className="text-2xl font-light leading-none">×</span>
        </button>

        <div className="grid gap-0 md:grid-cols-[1.2fr,1fr]">
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Email a Branded Quotation</h2>
                <p className="text-sm text-slate-500">We will send a complete QCS Cargo quotation with terms, pricing, and booking instructions.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-medium text-slate-700">Full name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  placeholder="Jane Smith"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Email address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Phone (optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  placeholder="201-555-0100"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Special instructions (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  placeholder="Let us know about insurance requirements, pickup needs, or customs documentation."
                />
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-xs leading-relaxed text-slate-600">
                  I confirm that I have reviewed the QCS Cargo quotation terms and conditions and understand that pricing is valid for seven (7) calendar days from issuance.
                </span>
              </label>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              {result && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="font-semibold">Quote {result.quoteReference} generated.</p>
                      <p className="mt-1 text-emerald-800">{result.message}</p>
                      <p className="mt-2 text-xs text-emerald-700">Valid until {expirationDate}. Total investment {formatCurrency(result.totalCost)}.</p>
                      {typeof result.billableWeight === 'number' && (
                        <p className="mt-2 text-xs text-emerald-700">
                          Billable weight confirmed at {result.billableWeight.toFixed(2)} lbs
                          {typeof result.ratePerLb === 'number' && result.ratePerLb > 0
                            ? ` (${formatCurrency(result.ratePerLb)} per lb)`
                            : ''}.
                        </p>
                      )}
                      {!result.emailDispatched && (
                        <p className="mt-2 text-xs text-amber-700">
                          ⚠️ Quote saved successfully, but email delivery is temporarily unavailable. You can view this quote in your dashboard. Our team will follow up shortly.
                        </p>
                      )}
                      {result.calculationFlagged && (
                        <p className="mt-2 text-xs text-amber-700">
                          Pricing adjustments were detected compared to the requested totals. A specialist will double-check
                          the figures before booking.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!result && (
                <button
                  type="submit"
                  disabled={loading || !calculatedRate}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:from-violet-700 hover:to-fuchsia-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending quotation…
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Email my QCS Cargo quote
                    </>
                  )}
                </button>
              )}
              
              {result && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Close & View on Dashboard
                </button>
              )}
            </form>
          </div>

          <aside className="flex flex-col gap-6 rounded-b-3xl border-t border-slate-100 bg-slate-50 p-6 md:rounded-b-none md:rounded-r-3xl md:border-l md:border-t-0">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-700">Quote Summary</h3>
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
                {calculatedRate ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900">Destination</span>
                      <span>{destinationSummary}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-medium text-slate-900">Service</span>
                      <span className="capitalize">{calculatedRate.serviceType}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-medium text-slate-900">Billable weight</span>
                      <span>{calculatedRate.weight.billable.toFixed(2)} lbs</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-medium text-slate-900">Total investment</span>
                      <span>{formatCurrency(calculatedRate.rateBreakdown.totalCost)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-medium text-slate-900">Transit estimate</span>
                      <span>{transitSummary}</span>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">Need adjustments? Update the calculator details and resend.</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">Calculate a shipment to preview summary details.</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-violet-700">Terms &amp; Conditions</h3>
              <div className="max-h-48 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-600 shadow-sm">
                {TERMS.map((term, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-violet-500" />
                    <span>{term}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-xs text-violet-700">
              <p className="font-semibold">Quote validity</p>
              <p className="mt-1 leading-relaxed">All quoted pricing is valid for 7 calendar days from issuance. After expiration a recalculation may be required due to capacity or carrier surcharges.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default QuoteEmailModal
