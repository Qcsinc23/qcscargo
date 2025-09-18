import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { featureFlags } from '@/lib/featureFlags'

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

interface VirtualAddressContextValue {
  address: VirtualAddress | null
  mailboxNumber: string | null
  loading: boolean
  error: string | null
  hasFetched: boolean
  fetchAddress: () => Promise<void>
}

const VirtualAddressContext = createContext<VirtualAddressContextValue | undefined>(undefined)

export const BASE_HEADER_HEIGHT = 56
export const VIRTUAL_MAILBOX_UTILITY_BAR_HEIGHT = 36

export function VirtualAddressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [address, setAddress] = useState<VirtualAddress | null>(null)
  const [mailboxNumber, setMailboxNumber] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)

  const resetState = useCallback(() => {
    setAddress(null)
    setMailboxNumber(null)
    setError(null)
    setHasFetched(false)
  }, [])

  useEffect(() => {
    resetState()
  }, [resetState, user?.id])

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
      setHasFetched(true)
    }
  }, [])

  useEffect(() => {
    if (!user?.id) {
      return
    }

    if (!featureFlags.virtualMailboxUi) {
      return
    }

    if (hasFetched || loading) {
      return
    }

    void fetchAddress()
  }, [fetchAddress, hasFetched, loading, user?.id])

  useEffect(() => {
    const shouldOffset = featureFlags.virtualMailboxUi && (address || loading || hasFetched)
    const totalHeight = shouldOffset
      ? BASE_HEADER_HEIGHT + VIRTUAL_MAILBOX_UTILITY_BAR_HEIGHT
      : BASE_HEADER_HEIGHT
    document.documentElement.style.setProperty('--header-offset', `${totalHeight}px`)

    return () => {
      document.documentElement.style.setProperty('--header-offset', `${BASE_HEADER_HEIGHT}px`)
    }
  }, [address, loading, hasFetched])

  const value = useMemo<VirtualAddressContextValue>(
    () => ({ address, mailboxNumber, loading, error, hasFetched, fetchAddress }),
    [address, mailboxNumber, loading, error, hasFetched, fetchAddress]
  )

  return <VirtualAddressContext.Provider value={value}>{children}</VirtualAddressContext.Provider>
}

export function useVirtualAddress() {
  const context = useContext(VirtualAddressContext)

  if (!context) {
    throw new Error('useVirtualAddress must be used within a VirtualAddressProvider')
  }

  return context
}
