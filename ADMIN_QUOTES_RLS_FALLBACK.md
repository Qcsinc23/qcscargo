# Admin Quotes RLS Fallback Implementation

## Overview

Implemented a stateful fallback mechanism for the admin quotes view that automatically detects RLS (Row Level Security) permission errors and falls back to a service-role edge function for subsequent requests.

## Problem Solved

When admins access the shipping quotes view, they may encounter 403 errors or RLS policy denials due to:
- JWT metadata not containing admin role
- RLS policies rejecting direct queries
- Session authentication issues

Previously, these errors would persist on every page refresh, requiring manual intervention.

## Solution Architecture

### 1. Service-Role Edge Function
**File:** `supabase/functions/admin-quotes-list/index.ts`

- Uses service-role key to bypass RLS policies
- Authenticates admin users via JWT verification
- Returns all quotes with proper authorization
- Provides audit logging for admin access

### 2. Stateful Fallback Tracking
**File:** `src/pages/admin/AdminQuoteManagement.tsx`

**State Management:**
```typescript
const [hasRlsFailed, setHasRlsFailed] = useState(() => {
  const stored = localStorage.getItem('admin_quotes_rls_failed')
  return stored === 'true'
})
```

**Benefits:**
- Persists across page refreshes and sessions
- Skips failing direct queries immediately on subsequent loads
- Reduces unnecessary error logs and failed requests
- Provides seamless user experience

### 3. RLS Denial Detection

The system detects permission errors through multiple patterns:

```typescript
const isRlsDenial = error && (
  error.message?.toLowerCase().includes('permission denied') ||
  error.message?.toLowerCase().includes('rls') ||
  error.message?.toLowerCase().includes('policy') ||
  error.code === 'PGRST301' || // PostgREST permission denied
  error.code === '42501' // PostgreSQL insufficient privilege
)
```

**Detected Error Types:**
- Permission denied errors
- RLS policy violations
- PostgreSQL insufficient privilege (42501)
- PostgREST permission errors (PGRST301)

## Flow Diagram

```
┌─────────────────────────┐
│   Load Quotes Request   │
└───────────┬─────────────┘
            │
            ▼
    ┌───────────────┐
    │ Check localStorage │
    │ hasRlsFailed?     │
    └───────┬───────────┘
            │
     ┌──────┴──────┐
     │             │
    YES           NO
     │             │
     │             ▼
     │     ┌──────────────┐
     │     │ Try Direct   │
     │     │ Query (RLS)  │
     │     └──────┬───────┘
     │            │
     │     ┌──────┴──────┐
     │     │             │
     │   SUCCESS      ERROR
     │     │             │
     │     ▼             ▼
     │ ┌─────────┐  ┌──────────────┐
     │ │ Display │  │ Is RLS       │
     │ │ Quotes  │  │ Denial?      │
     │ └─────────┘  └──────┬───────┘
     │                     │
     │              ┌──────┴──────┐
     │              │             │
     │             YES           NO
     │              │             │
     │              ▼             ▼
     │      ┌──────────────┐  ┌──────────┐
     │      │ Set          │  │ Show     │
     │      │ hasRlsFailed │  │ Error    │
     │      │ = true       │  └──────────┘
     │      └──────┬───────┘
     │             │
     └─────────────┤
                   │
                   ▼
          ┌────────────────┐
          │ Call Service-  │
          │ Role Function  │
          └────────┬───────┘
                   │
                   ▼
          ┌────────────────┐
          │ Display Quotes │
          └────────────────┘
```

## Implementation Details

### Edge Function: admin-quotes-list

**Security:**
- Verifies admin access using JWT
- Uses service-role key to bypass RLS
- Logs all access for audit trail

**Response Format:**
```typescript
{
  success: true,
  data: ShippingQuote[],
  count: number
}
```

### Frontend Fallback Logic

**First Load (No RLS Failure History):**
1. Attempts direct query to `shipping_quotes` table
2. If RLS denial detected:
   - Sets `hasRlsFailed = true`
   - Saves to `localStorage`
   - Calls service-role function
3. If other error: Shows error to user
4. If success: Displays quotes normally

**Subsequent Loads (RLS Previously Failed):**
1. Checks `localStorage` for `admin_quotes_rls_failed`
2. Skips direct query entirely
3. Calls service-role function immediately
4. Displays quotes

### localStorage Key

**Key:** `admin_quotes_rls_failed`
**Value:** `"true"` (string)
**Persistence:** Remains until cleared manually or cache cleared

## Benefits

✅ **Automatic Recovery:** No manual intervention needed after RLS failures
✅ **Performance:** Skips failing queries on subsequent loads
✅ **User Experience:** Seamless fallback without visible errors
✅ **Audit Trail:** All service-role access is logged
✅ **Security:** Maintains admin verification for all requests
✅ **Resilient:** Handles multiple types of permission errors

## Deployment Steps

### 1. Deploy Edge Function
```bash
supabase functions deploy admin-quotes-list
```

### 2. Deploy Frontend Changes
The changes are in `src/pages/admin/AdminQuoteManagement.tsx` and will be deployed automatically via Vercel when pushed to main.

### 3. Test the Fallback
1. Access admin quotes page
2. If RLS fails, check console for "RLS denial detected" message
3. Verify quotes load via service-role function
4. Refresh page - should skip direct query and use function immediately
5. Check localStorage for `admin_quotes_rls_failed = "true"`

### 4. Clear Fallback (if needed)
To reset and test direct queries again:
```javascript
localStorage.removeItem('admin_quotes_rls_failed')
```

## Monitoring

### Console Logs

**RLS Failure Detected:**
```
RLS denial detected, falling back to service-role function: [error details]
```

**Using Cached Fallback:**
```
Previous RLS failure detected, using service-role function
```

**Success via Function:**
```
Successfully loaded [N] quotes via service-role function
```

### Edge Function Logs
Check Supabase dashboard for:
- Admin access logs
- Quote fetch counts
- Error patterns

## Troubleshooting

### Issue: Quotes still not loading
**Solution:** Check edge function deployment
```bash
supabase functions list
supabase functions logs admin-quotes-list
```

### Issue: Fallback not persisting
**Solution:** Check localStorage is enabled and not blocked by browser

### Issue: Permission errors in edge function
**Solution:** Verify service-role key is set in environment variables

## Related Files

- `supabase/functions/admin-quotes-list/index.ts` - Service-role edge function
- `src/pages/admin/AdminQuoteManagement.tsx` - Frontend with fallback logic
- `supabase/functions/_shared/auth-utils.ts` - Shared authentication utilities

## Future Enhancements

1. **Auto-clear on successful direct query** - Reset fallback flag if RLS starts working
2. **Metrics dashboard** - Track fallback usage rates
3. **Admin notification** - Alert admins about RLS configuration issues
4. **TTL for fallback flag** - Auto-expire after N days to retry direct query
