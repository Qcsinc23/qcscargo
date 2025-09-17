import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface VirtualAddress {
  name: string
  line1: string
  line2: string | null
  line3: string
  city: string
  state: string
  postal_code: string
  country: string
  facility_code: string
}

interface FetchResult {
  address: VirtualAddress
  mailbox_number: string
}

export function useVirtualAddress() {
  const [address, setAddress] = useState<VirtualAddress | null>(null)
  const [mailboxNumber, setMailboxNumber] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAddress = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.functions.invoke<FetchResult>('get-virtual-address')

      if (error) {
        throw error
      }

      if (data?.address) {
        setAddress(data.address)
        setMailboxNumber(data.mailbox_number ?? data.address?.line3?.replace('Mailbox ', '') ?? null)
      } else {
        setAddress(null)
        setMailboxNumber(null)
      }
    } catch (err: any) {
      console.error('Failed to fetch virtual address:', err)

      let message = 'Unable to load your virtual mailbox address.'
      const code = typeof err?.code === 'number' ? err.code : Number(err?.status)
      const details = typeof err?.message === 'string' ? err.message : ''

      if (code === 401 || details.toLowerCase().includes('unauthorized')) {
        message = 'Please verify your email and sign in to view your mailbox address.'
      } else if (code === 404 || details.includes('MAILBOX_NOT_FOUND') || details.includes('No virtual mailbox assigned')) {
        message = 'We are finishing your mailbox assignment. Try refreshing in a few moments.'
      } else if (details) {
        message = details
      }

      setError(message)
      setAddress(null)
      setMailboxNumber(null)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    address,
    mailboxNumber,
    loading,
    error,
    fetchAddress
  }
}
