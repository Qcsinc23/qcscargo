import {
  verifyAdminAccess,
  handleOptions,
  createErrorResponse,
  createSuccessResponse,
  logAdminAction
} from '../_shared/auth-utils.ts'

type PackageInput = {
  trackingNumber?: unknown
  notes?: unknown
  weight?: unknown
  carrier?: unknown
}

type RequestPayload = {
  mailboxNumber?: unknown
  packages?: unknown
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleOptions()
  }

  if (req.method !== 'POST') {
    return createErrorResponse('METHOD_NOT_ALLOWED', 'Only POST requests are supported.', 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return createErrorResponse('CONFIG_ERROR', 'Supabase configuration is missing.', 500)
    }

    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization')

    const authResult = await verifyAdminAccess(authHeader ?? '', supabaseUrl, serviceRoleKey)
    if (!authResult.success || !authResult.user) {
      return createErrorResponse('FORBIDDEN', authResult.error || 'Admin access required.', 403)
    }

    const payload = (await req.json().catch(() => null)) as RequestPayload | null
    if (!payload) {
      return createErrorResponse('INVALID_PAYLOAD', 'Request body must be valid JSON.', 400)
    }

    const rawMailboxNumber = typeof payload.mailboxNumber === 'string' ? payload.mailboxNumber.trim() : ''
    if (!rawMailboxNumber) {
      return createErrorResponse('VALIDATION_ERROR', 'Mailbox number is required.', 400)
    }

    const packagesInput = Array.isArray(payload.packages) ? (payload.packages as PackageInput[]) : []
    if (packagesInput.length === 0) {
      return createErrorResponse('VALIDATION_ERROR', 'At least one package must be provided.', 400)
    }

    const mailboxNumber = rawMailboxNumber.toUpperCase()
    const uniquePackages = new Map<string, { notes: string | null; weight: number | null; carrier: string | null }>()

    for (const pkg of packagesInput) {
      const tracking = typeof pkg.trackingNumber === 'string' ? pkg.trackingNumber.trim() : ''
      if (!tracking) {
        return createErrorResponse('VALIDATION_ERROR', 'Each package requires a tracking number.', 400)
      }

      const normalizedTracking = tracking.toUpperCase()
      if (uniquePackages.has(normalizedTracking)) {
        continue
      }

      const notes = typeof pkg.notes === 'string' && pkg.notes.trim().length > 0 ? pkg.notes.trim() : null
      const weightValue = typeof pkg.weight === 'number' && Number.isFinite(pkg.weight) ? pkg.weight : null
      const carrier = typeof pkg.carrier === 'string' && pkg.carrier.trim().length > 0 ? pkg.carrier.trim() : null

      uniquePackages.set(normalizedTracking, {
        notes,
        weight: weightValue,
        carrier
      })
    }

    if (uniquePackages.size === 0) {
      return createErrorResponse('VALIDATION_ERROR', 'No valid packages were provided.', 400)
    }

    const mailboxResponse = await fetch(
      `${supabaseUrl}/rest/v1/virtual_mailbox_details?select=id,user_id,mailbox_number,full_name,email&mailbox_number=eq.${encodeURIComponent(mailboxNumber)}`,
      {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey
        }
      }
    )

    if (!mailboxResponse.ok) {
      const errorText = await mailboxResponse.text()
      console.error('Failed to load mailbox:', mailboxResponse.status, errorText)
      return createErrorResponse('MAILBOX_LOOKUP_FAILED', 'Failed to verify mailbox number.', 500)
    }

    const mailboxData = await mailboxResponse.json()
    if (!Array.isArray(mailboxData) || mailboxData.length === 0) {
      return createErrorResponse('MAILBOX_NOT_FOUND', 'Mailbox not found.', 404)
    }

    const mailbox = mailboxData[0] as {
      id: number
      user_id: string
      mailbox_number: string
      full_name?: string | null
      email?: string | null
    }

    const packagesToInsert = Array.from(uniquePackages.entries()).map(([trackingNumber, details]) => ({
      user_id: mailbox.user_id,
      mailbox_id: mailbox.id,
      tracking_number: trackingNumber,
      notes: details.notes,
      weight: details.weight,
      carrier: details.carrier,
      received_by: authResult.user!.id,
      status: 'received_at_warehouse'
    }))

    const insertResponse = await fetch(
      `${supabaseUrl}/rest/v1/received_packages?on_conflict=tracking_number`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          'Content-Type': 'application/json',
          Prefer: 'return=representation,resolution=ignore-duplicates'
        },
        body: JSON.stringify(packagesToInsert)
      }
    )

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text()
      console.error('Failed to insert received packages:', insertResponse.status, errorText)
      return createErrorResponse('PACKAGE_INSERT_FAILED', 'Unable to record received packages.', 500)
    }

    const insertedPackages = await insertResponse.json()
    if (!Array.isArray(insertedPackages) || insertedPackages.length === 0) {
      return createErrorResponse(
        'DUPLICATE_PACKAGES',
        'All provided tracking numbers have already been recorded.',
        409
      )
    }

    const trackingList = insertedPackages.map((pkg: { tracking_number: string }) => pkg.tracking_number).join(', ')
    const insertedCount = insertedPackages.length

    logAdminAction('ADMIN_RECEIVE_PACKAGES', authResult.user!, {
      mailbox_id: mailbox.id,
      mailbox_number: mailbox.mailbox_number,
      package_count: insertedCount
    })

    const notificationPayload = {
      user_id: mailbox.user_id,
      recipient_type: 'customer',
      title: insertedCount === 1 ? 'Package Received' : 'Packages Received',
      message: `We received ${insertedCount} package${insertedCount === 1 ? '' : 's'} for mailbox ${mailbox.mailbox_number}. Tracking: ${trackingList}`,
      reference_type: 'received_package',
      reference_id: insertedPackages[0]?.id ?? null,
      priority: 'normal',
      created_at: new Date().toISOString()
    }

    const notificationResponse = await fetch(`${supabaseUrl}/rest/v1/notifications`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(notificationPayload)
    })

    if (!notificationResponse.ok) {
      console.error('Failed to create notification for received packages:', notificationResponse.status)
    }

    const customerName = mailbox.full_name || 'customer'

    return createSuccessResponse({
      message: `Successfully recorded ${insertedCount} package${insertedCount === 1 ? '' : 's'} for ${customerName}.`,
      tracking_numbers: insertedPackages.map((pkg: { tracking_number: string }) => pkg.tracking_number)
    })
  } catch (error) {
    console.error('admin-receive-package error:', error)
    const message = error instanceof Error ? error.message : 'Unexpected error while recording packages.'
    return createErrorResponse('UNEXPECTED_ERROR', message)
  }
})
