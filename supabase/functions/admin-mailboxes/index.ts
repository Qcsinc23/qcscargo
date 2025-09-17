import { handleOptions, createErrorResponse, createSuccessResponse, verifyAdminAccess } from '../_shared/auth-utils.ts'

interface RequestPayload {
  search?: string
  limit?: number
  offset?: number
}

function buildQueryParams({ search, limit, offset }: Required<RequestPayload>) {
  const params: string[] = ['select=*', 'order=created_at.desc', `limit=${limit}`, `offset=${offset}`]

  if (search) {
    const escaped = search.replace(/[%_*]/g, (match) => `\\${match}`)
    const encodedValue = encodeURIComponent(`*${escaped}*`)
    params.push(`or=(mailbox_number.ilike.${encodedValue},email.ilike.${encodedValue})`)
  }

  return params.join('&')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleOptions()
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return createErrorResponse('CONFIG_MISSING', 'Supabase configuration is missing.')
    }

    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization')
    if (!authHeader) {
      return createErrorResponse('UNAUTHORIZED', 'Authorization header is required.', 401)
    }

    const authResult = await verifyAdminAccess(authHeader, supabaseUrl, serviceRoleKey)
    if (!authResult.success || !authResult.user) {
      return createErrorResponse('FORBIDDEN', authResult.error || 'Admin access required.', 403)
    }

    let payload: RequestPayload = {}
    if (req.method === 'POST') {
      payload = await req.json().catch(() => ({}))
    } else {
      const url = new URL(req.url)
      payload.search = url.searchParams.get('search') ?? undefined
      payload.limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined
      payload.offset = url.searchParams.get('offset') ? Number(url.searchParams.get('offset')) : undefined
    }

    const limit = Number.isFinite(payload.limit) && payload.limit ? Math.min(Math.max(payload.limit, 1), 200) : 50
    const offset = Number.isFinite(payload.offset) && payload.offset ? Math.max(payload.offset, 0) : 0
    const search = payload.search?.trim() || ''

    const queryParams = buildQueryParams({ search, limit, offset })
    const requestUrl = `${supabaseUrl}/rest/v1/virtual_mailbox_details?${queryParams}`

    const response = await fetch(requestUrl, {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        'Content-Type': 'application/json',
        Prefer: 'count=exact'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to fetch virtual mailboxes:', response.status, errorText)
      return createErrorResponse('MAILBOX_LIST_FAILED', 'Failed to load virtual mailboxes.')
    }

    const data = await response.json()
    const contentRange = response.headers.get('content-range')
    const total = contentRange ? Number(contentRange.split('/')[1]) : data.length

    const entries = Array.isArray(data)
      ? data.map((row: any) => ({
          ...row,
          formatted_address: [
            row.full_name || row.email || 'Customer',
            [row.address_line1, row.address_line2].filter(Boolean).join(row.address_line2 ? ', ' : ''),
            `Mailbox ${row.mailbox_number}`,
            `${row.city}, ${row.state} ${row.postal_code}`,
            row.country
          ]
            .filter(Boolean)
            .join('\n')
        }))
      : []

    return createSuccessResponse({
      mailboxes: entries,
      pagination: {
        limit,
        offset,
        total,
        has_more: offset + limit < total
      }
    })
  } catch (error) {
    console.error('admin-mailboxes error:', error)
    const message = error instanceof Error ? error.message : 'Unexpected error listing mailboxes.'
    return createErrorResponse('UNEXPECTED_ERROR', message)
  }
})
