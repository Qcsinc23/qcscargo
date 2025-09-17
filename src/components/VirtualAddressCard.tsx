import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { VirtualAddress } from '@/hooks/useVirtualAddress'

interface VirtualAddressCardProps {
  address: VirtualAddress | null
  loading: boolean
  onRefresh?: () => void
}

export function VirtualAddressCard({ address, loading, onRefresh }: VirtualAddressCardProps) {
  const formatted = React.useMemo(() => {
    if (!address) {
      return ''
    }

    return [
      address.name,
      [address.line1, address.line2].filter(Boolean).join(address.line2 ? ', ' : ''),
      address.line3,
      `${address.city}, ${address.state} ${address.postal_code}`,
      address.country
    ]
      .filter(Boolean)
      .join('\n')
  }, [address])

  const handleCopy = async () => {
    if (!formatted) {
      return
    }

    try {
      await navigator.clipboard.writeText(formatted)
      toast.success('Address copied to clipboard')
    } catch (error) {
      console.error('Failed to copy address:', error)
      toast.error('Could not copy address. Please copy it manually.')
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Your U.S. Shipping Address</CardTitle>
        <CardDescription>
          Ship your U.S. orders to this address. Keep the mailbox number on its own line so we can match your
          packages quickly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading your virtual mailbox…</div>
        ) : address ? (
          <pre className="rounded-lg bg-muted px-4 py-3 text-sm whitespace-pre-wrap border border-dashed">
            {formatted}
          </pre>
        ) : (
          <div className="text-sm text-muted-foreground">
            We could not find a virtual mailbox for your account yet. Please refresh or contact support if this
            persists.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleCopy} disabled={!address} variant="default">
            Copy Address
          </Button>
          {onRefresh && (
            <Button onClick={onRefresh} disabled={loading} variant="outline">
              Refresh
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default VirtualAddressCard
