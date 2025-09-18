import clsx from 'clsx'
import type { VirtualAddress } from '@/hooks/useVirtualAddress'

type AddressInlineBadgeProps = {
  address?: VirtualAddress | null
  mailboxNumber?: string | null
  loading?: boolean
  onGetAddressClick?: () => void
  onCopy?: () => void
  className?: string
}

function formatAddress(address: VirtualAddress) {
  return [
    address.name,
    [address.line1, address.line2].filter(Boolean).join(address.line2 ? ', ' : ''),
    address.line3,
    `${address.city}, ${address.state} ${address.postal_code}`,
    address.country
  ]
    .filter(Boolean)
    .join('\n')
}

export default function AddressInlineBadge({
  address,
  mailboxNumber,
  loading,
  onGetAddressClick,
  onCopy,
  className
}: AddressInlineBadgeProps) {
  if (loading) {
    return (
      <div
        className={clsx(
          'inline-flex min-h-[36px] min-w-[200px] items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm',
          'animate-pulse text-slate-400',
          className
        )}
      >
        Loading mailbox…
      </div>
    )
  }

  if (!address) {
    return (
      <button
        type="button"
        onClick={onGetAddressClick}
        className={clsx(
          'inline-flex min-h-[36px] items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 transition-colors',
          'hover:bg-slate-50',
          className
        )}
        title="Get your free U.S. mailbox address"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
        Get your U.S. address (free)
      </button>
    )
  }

  const resolvedMailboxNumber = mailboxNumber ?? address.line3.replace(/^Mailbox\s*/i, '')
  const formatted = formatAddress(address)

  const handleCopy = async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        throw new Error('Clipboard API unavailable')
      }

      await navigator.clipboard.writeText(formatted)
      onCopy?.()
    } catch (error) {
      console.error('Failed to copy address:', error)
    }
  }

  return (
    <div
      className={clsx(
        'inline-flex min-h-[36px] items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm shadow-sm',
        className
      )}
    >
      <span className="text-slate-700">
        Mailbox: <span className="font-semibold">{resolvedMailboxNumber}</span>
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="rounded px-2 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
        title="Copy your full U.S. address"
        aria-label="Copy your full U.S. address"
      >
        Copy
      </button>
    </div>
  )
}
