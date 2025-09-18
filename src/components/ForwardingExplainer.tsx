import clsx from 'clsx'

type ForwardingExplainerProps = {
  country?: string
  className?: string
}

export default function ForwardingExplainer({ country = 'Guyana', className }: ForwardingExplainerProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm',
        className
      )}
    >
      <h3 className="text-lg font-semibold text-slate-900">Use U.S. retailers — we forward to {country}</h3>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
        <li>
          At checkout, use <strong>Your U.S. Address</strong> (we assign it at sign-up).
        </li>
        <li>
          We receive packages, <strong>consolidate</strong> on request, and prepare customs.
        </li>
        <li>
          We ship by air to <strong>{country}</strong> with full tracking.
        </li>
      </ol>
      <p className="mt-2 text-xs text-slate-500">
        Consolidation reduces cost; tracking keeps every parcel visible end-to-end.
      </p>
    </div>
  )
}
