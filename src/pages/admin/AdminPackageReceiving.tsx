import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { CheckCircle, ScanBarcode, Search, UserCheck, UserX, X } from 'lucide-react'

type PackageDraft = {
  trackingNumber: string
  notes: string
}

type CustomerInfo = {
  name: string
  email: string | null
}

const AdminPackageReceiving: React.FC = () => {
  const [mailboxNumber, setMailboxNumber] = useState('')
  const [scannedTracking, setScannedTracking] = useState('')
  const [packages, setPackages] = useState<PackageDraft[]>([])
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const scannerInputRef = useRef<HTMLInputElement | null>(null)
  const debounceTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!mailboxNumber.trim()) {
      setCustomerInfo(null)
      setVerificationError(null)
      return
    }

    window.clearTimeout(debounceTimer.current)
    debounceTimer.current = window.setTimeout(async () => {
      setIsVerifying(true)
      setVerificationError(null)
      setCustomerInfo(null)
      try {
        const normalized = mailboxNumber.trim().toUpperCase()
        const { data, error } = await supabase
          .from('virtual_mailbox_details')
          .select('full_name,email')
          .eq('mailbox_number', normalized)
          .maybeSingle()

        if (error && error.code !== 'PGRST116') {
          throw error
        }

        if (!data) {
          setVerificationError('Mailbox not found. Double-check the number or search by customer name.')
        } else {
          setCustomerInfo({ name: data.full_name || 'Customer', email: data.email || null })
          setVerificationError(null)
          window.requestAnimationFrame(() => {
            scannerInputRef.current?.focus()
          })
        }
      } catch (err) {
        console.error('Mailbox verification failed:', err)
        setVerificationError('Unable to verify mailbox at the moment.')
      } finally {
        setIsVerifying(false)
      }
    }, 500)

    return () => {
      window.clearTimeout(debounceTimer.current)
    }
  }, [mailboxNumber])

  const handleScanKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    attemptAddTracking()
  }

  const attemptAddTracking = () => {
    const trackingValue = scannedTracking.trim()
    if (!trackingValue) {
      return
    }

    const normalized = trackingValue.toUpperCase()
    if (packages.some((pkg) => pkg.trackingNumber === normalized)) {
      toast.error('This tracking number is already in this batch.')
      setScannedTracking('')
      return
    }

    setPackages((prev) => [...prev, { trackingNumber: normalized, notes: '' }])
    setScannedTracking('')
    window.requestAnimationFrame(() => {
      scannerInputRef.current?.focus()
    })
  }

  const handleNoteChange = (index: number, value: string) => {
    setPackages((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], notes: value }
      return next
    })
  }

  const handleRemovePackage = (index: number) => {
    setPackages((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleSearchByName = () => {
    toast.info('Customer lookup by name is coming soon. For now, enter the mailbox number directly.')
  }

  const packageCountLabel = useMemo(() => {
    if (packages.length === 0) {
      return 'Scan packages to add them to this batch.'
    }

    return `${packages.length} package${packages.length === 1 ? '' : 's'} ready to record`
  }, [packages.length])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!customerInfo) {
      toast.error('Verify a mailbox before submitting packages.')
      return
    }

    if (packages.length === 0) {
      toast.error('Add at least one package to continue.')
      return
    }

    try {
      setIsSubmitting(true)
      const { data, error } = await supabase.functions.invoke<{
        message: string
        tracking_numbers: string[]
      }>('admin-receive-package', {
        body: {
          mailboxNumber: mailboxNumber.trim().toUpperCase(),
          packages: packages.map((pkg) => ({
            trackingNumber: pkg.trackingNumber,
            notes: pkg.notes || null
          }))
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      toast.success(data?.message || 'Packages recorded successfully.')
      setPackages([])
      setMailboxNumber('')
      setScannedTracking('')
      setCustomerInfo(null)
      setVerificationError(null)
    } catch (err) {
      console.error('Failed to submit received packages:', err)
      const message = err instanceof Error ? err.message : 'Unable to record packages.'
      if (message.includes('MAILBOX_NOT_FOUND')) {
        toast.error('Mailbox not found. Confirm the number and try again.')
      } else if (message.includes('DUPLICATE_PACKAGES')) {
        toast.error('Each tracking number in this batch has already been recorded.')
      } else {
        toast.error(message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Package Receiving</h1>
        <p className="text-sm text-slate-600">
          Batch scan incoming packages for a customer, record notes, and send one consolidated notification.
        </p>
      </div>

      <Card className="max-w-5xl">
        <CardHeader>
          <CardTitle>Batch Receive Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
              <div className="space-y-2">
                <Label htmlFor="mailboxNumber">Mailbox Number</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="mailboxNumber"
                    placeholder="Scan or enter mailbox number"
                    value={mailboxNumber}
                    onChange={(event) => setMailboxNumber(event.target.value.toUpperCase())}
                    autoComplete="off"
                    className="uppercase"
                    disabled={isSubmitting}
                  />
                  <Button type="button" variant="outline" onClick={handleSearchByName} disabled={isSubmitting}>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                </div>
                <div className="min-h-[28px]">
                  {isVerifying && <p className="text-xs text-slate-500">Verifying mailbox…</p>}
                  {verificationError && !isVerifying && (
                    <p className="text-xs text-amber-600">{verificationError}</p>
                  )}
                  {customerInfo && !isVerifying && (
                    <div className="flex items-center gap-2 text-sm text-emerald-700">
                      <UserCheck className="h-4 w-4" />
                      <span>
                        {customerInfo.name}
                        {customerInfo.email ? ` • ${customerInfo.email}` : ''}
                      </span>
                    </div>
                  )}
                  {!customerInfo && mailboxNumber && !isVerifying && !verificationError && (
                    <div className="flex items-center gap-2 text-sm text-rose-600">
                      <UserX className="h-4 w-4" />
                      <span>Mailbox not found.</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                {packages.length > 0 && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {packageCountLabel}
                  </Badge>
                )}
              </div>
            </div>

            {customerInfo && (
              <div className="space-y-5 border-t border-slate-200 pt-5">
                <div className="space-y-2">
                  <Label htmlFor="trackingInput">Scan Tracking Number</Label>
                  <div className="relative">
                    <Input
                      id="trackingInput"
                      ref={scannerInputRef}
                      value={scannedTracking}
                      onChange={(event) => setScannedTracking(event.target.value)}
                      onKeyDown={handleScanKeyDown}
                      placeholder="Scan barcode and press Enter"
                      autoComplete="off"
                      disabled={isSubmitting}
                    />
                    <ScanBarcode className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">Scanned Packages</h3>
                    {packages.length > 0 && (
                      <span className="text-xs text-slate-500">Press Enter after each scan to add it here.</span>
                    )}
                  </div>
                  {packages.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                      Start scanning to build the batch for this customer.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {packages.map((pkg, index) => (
                        <div key={pkg.trackingNumber} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-mono text-sm text-slate-900">{pkg.trackingNumber}</p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemovePackage(index)}
                                  className="text-rose-500 hover:text-rose-600"
                                  disabled={isSubmitting}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <Textarea
                                value={pkg.notes}
                                onChange={(event) => handleNoteChange(index, event.target.value)}
                                placeholder="Optional notes: damage, missing paperwork, storage instructions…"
                                rows={2}
                                disabled={isSubmitting}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <p className="text-xs text-slate-500">
                    Once submitted, customers receive a single notification summarizing everything in this batch.
                  </p>
                  <Button type="submit" disabled={isSubmitting || packages.length === 0} className="md:w-auto">
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <ScanBarcode className="h-4 w-4 animate-spin" />
                        Notifying customer…
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Record & Notify
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminPackageReceiving
