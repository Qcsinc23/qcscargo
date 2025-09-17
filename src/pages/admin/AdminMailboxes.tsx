import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Download, Mail, MapPin, RefreshCw, Search, User } from 'lucide-react'

interface MailboxEntry {
  id: number
  user_id: string
  mailbox_number: string
  facility_code: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  postal_code: string
  country: string
  full_name: string | null
  email: string | null
  created_at: string
  formatted_address: string
}

const PAGE_SIZE = 25

const AdminMailboxes: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [pendingSearch, setPendingSearch] = useState('')
  const [mailboxes, setMailboxes] = useState<MailboxEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)

  useEffect(() => {
    const debounce = setTimeout(() => {
      setSearchTerm(pendingSearch)
      setPage(0)
    }, 300)

    return () => clearTimeout(debounce)
  }, [pendingSearch])

  useEffect(() => {
    loadMailboxes()
  }, [searchTerm, page])

  const loadMailboxes = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.functions.invoke<{
        mailboxes: MailboxEntry[]
        pagination: { total: number }
      }>('admin-mailboxes', {
        body: {
          search: searchTerm,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE
        }
      })

      if (error) {
        throw error
      }

      setMailboxes(data?.mailboxes || [])
      setTotal(data?.pagination?.total || 0)
    } catch (err) {
      console.error('Failed to load virtual mailboxes:', err)
      const message = err instanceof Error ? err.message : 'Unable to load mailboxes.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const filteredCount = useMemo(() => mailboxes.length, [mailboxes])

  const handleCopy = async (entry: MailboxEntry) => {
    try {
      await navigator.clipboard.writeText(entry.formatted_address)
      toast.success(`Copied ${entry.mailbox_number}`)
    } catch (error) {
      console.error('Failed to copy mailbox:', error)
      toast.error('Copy failed. Please copy the address manually.')
    }
  }

  const handleExport = () => {
    if (!mailboxes.length) {
      toast.warning('No records to export on this page')
      return
    }

    const header = [
      'Mailbox Number',
      'Full Name',
      'Email',
      'Facility Code',
      'Address Line 1',
      'Address Line 2',
      'City',
      'State',
      'Postal Code',
      'Country',
      'Created At'
    ]

    const rows = mailboxes.map((entry) => [
      entry.mailbox_number,
      entry.full_name || '',
      entry.email || '',
      entry.facility_code,
      entry.address_line1,
      entry.address_line2 || '',
      entry.city,
      entry.state,
      entry.postal_code,
      entry.country,
      entry.created_at
    ])

    const csvContent = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `virtual-mailboxes-page-${page + 1}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Virtual Mailboxes</h1>
          <p className="text-sm text-slate-600">Search, copy, and export assigned mailbox addresses.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by mailbox or email"
              value={pendingSearch}
              onChange={(event) => setPendingSearch(event.target.value)}
              className="pl-10"
              aria-label="Search virtual mailboxes"
            />
          </div>
          <Button variant="outline" onClick={loadMailboxes} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-600">Mailbox</th>
              <th className="px-4 py-3 font-medium text-slate-600">Customer</th>
              <th className="px-4 py-3 font-medium text-slate-600">Email</th>
              <th className="px-4 py-3 font-medium text-slate-600">Facility</th>
              <th className="px-4 py-3 font-medium text-slate-600">Location</th>
              <th className="px-4 py-3 font-medium text-slate-600">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  Loading virtual mailboxes…
                </td>
              </tr>
            ) : mailboxes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  No mailboxes found.
                </td>
              </tr>
            ) : (
              mailboxes.map((entry) => (
                <tr key={entry.id} className="odd:bg-white even:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{entry.mailbox_number}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      {entry.full_name || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {entry.email || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{entry.facility_code}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {entry.city}, {entry.state}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => handleCopy(entry)}>
                      Copy
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <div>
          Showing {filteredCount} of {total} mailboxes
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
            disabled={page === 0 || loading}
          >
            Previous
          </Button>
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => (prev + 1 < totalPages ? prev + 1 : prev))}
            disabled={page + 1 >= totalPages || loading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AdminMailboxes
