# RLS Circular Dependency Fix - Complete Implementation Guide

**Date:** October 12, 2025
**Priority:** P0 - CRITICAL
**Status:** Ready for Deployment

---

## 🔍 ROOT CAUSE ANALYSIS

### Problem 1: Profiles Not Showing Up
**Symptom:** User profiles don't load, blank dashboard
**Root Cause:** Circular dependency in RLS policies

```
Request: SELECT * FROM user_profiles WHERE id = auth.uid()
  ↓
Policy Check: public.is_admin()
  ↓
Function: public.get_user_role()
  ↓
Query: SELECT role FROM user_profiles WHERE id = auth.uid()
  ↓
Policy Check: public.is_admin()
  ↓
[INFINITE LOOP] ❌
```

### Problem 2: 403 Errors on shipping_quotes
**Symptom:** `Failed to load resource: 403`
**Root Cause:** RLS policy references `auth.users` table

```sql
-- BROKEN POLICY (Line 53 of 1757000000_enhance_shipping_quotes.sql)
email = (SELECT email FROM auth.users WHERE id = auth.uid())
```

**Issue:** PostgreSQL RLS policies cannot query system schemas (`auth.users`)

### Problem 3: Role Not in JWT
**Symptom:** Logs show `"Database role verification (fallback): Object"`
**Root Cause:** Role exists in `user_profiles` table but NOT in JWT `user_metadata`

---

## ✅ SOLUTION: Industry-Standard JWT-Based Authorization

### Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│  Single Source of Truth: JWT user_metadata.role     │
└──────────────────────────────────────────────────────┘
                        ↓
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────┐            ┌──────────────────┐
│  RLS Policies │            │  Application     │
│  (read JWT)   │            │  (read JWT)      │
└───────────────┘            └──────────────────┘
        │                               │
        └───────────────┬───────────────┘
                        ▼
            ┌──────────────────────┐
            │  user_profiles.role  │
            │  (backup/display)    │
            └──────────────────────┘
```

**Key Principles:**
1. JWT `user_metadata.role` is the **single source of truth**
2. RLS policies read **ONLY from JWT** (no database queries)
3. `user_profiles.role` is backup/display only
4. Zero circular dependencies

---

## 📋 IMPLEMENTATION STEPS

### Step 1: Apply Database Migration

```bash
# Run the migration
psql $DATABASE_URL -f supabase/migrations/1758300000_fix_rls_circular_dependency.sql
```

**What this does:**
1. Recreates helper functions to use ONLY JWT claims
2. Fixes `user_profiles` RLS policies (no circular dependency)
3. Fixes `shipping_quotes` RLS policies (removes `auth.users` reference)
4. Adds proper grants and permissions

### Step 2: Sync Roles to JWT Metadata

**Option A: Via Supabase Dashboard (Manual)**
1. Go to Supabase Dashboard > Authentication > Users
2. For each user, click Edit
3. Add to **User Metadata** (not Raw User Metadata):
   ```json
   {
     "role": "admin"
   }
   ```
4. Save

**Option B: Via Script (Automated)**
```bash
# Install dependencies
npm install tsx

# Set environment variables
export VITE_SUPABASE_URL="your_supabase_url"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Run sync script
npx tsx scripts/sync-roles-to-jwt.ts
```

**Option C: Via Supabase Admin API**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

await supabase.auth.admin.updateUserById(userId, {
  user_metadata: {
    role: 'admin'  // or 'staff' or 'customer'
  }
})
```

### Step 3: Force Users to Re-login

JWT tokens are cached. Users must log out and back in for changes to take effect.

**Two approaches:**

**A. Graceful (Recommended):**
- Show banner: "System updated. Please log out and back in."
- Force re-login after 24 hours

**B. Immediate:**
```typescript
// In your application, after migration
await supabase.auth.signOut()
window.location.href = '/auth/login'
```

---

## 🧪 TESTING

### Test 1: Profile Loading
```typescript
// Should now work without errors
const { data, error } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', user.id)
  .single()

// ✅ data should contain profile
// ✅ No circular dependency error
```

### Test 2: Shipping Quotes
```typescript
// Should now work for customers
const { data, error } = await supabase
  .from('shipping_quotes')
  .select('*')
  .eq('customer_id', user.id)

// ✅ data should contain quotes
// ✅ No 403 error
```

### Test 3: Admin Access
```typescript
// Admin should see all profiles
const { data, error } = await supabase
  .from('user_profiles')
  .select('*')

// ✅ Returns all profiles for admin
// ✅ Returns only own profile for customer
```

### Test 4: Role Check Functions
```sql
-- Test in Supabase SQL Editor
SELECT public.is_admin();  -- Should return true/false
SELECT public.is_staff();  -- Should return true/false
SELECT public.get_jwt_claim('role');  -- Should return role
```

---

## 🔒 SECURITY VALIDATION

### RLS Policy Checklist

- [x] No circular dependencies (✅ JWT-only)
- [x] No `auth.users` references (✅ Removed)
- [x] Proper access control (✅ Users see own data, admins see all)
- [x] Role cannot be changed by users (✅ Enforced in WITH CHECK)
- [x] Service role has full access (✅ Explicitly granted)

### Test Security

```sql
-- As regular user, try to update role (should fail)
UPDATE user_profiles SET role = 'admin' WHERE id = auth.uid();
-- ❌ Should be blocked by RLS policy

-- As regular user, try to see other profiles (should fail)
SELECT * FROM user_profiles WHERE id != auth.uid();
-- ❌ Should return empty or error

-- As admin, try to see all profiles (should succeed)
SELECT * FROM user_profiles;
-- ✅ Should return all profiles
```

---

## 📊 MONITORING

### Key Metrics to Watch

1. **Profile Load Success Rate**
   ```sql
   SELECT
     COUNT(*) as total_requests,
     COUNT(*) FILTER (WHERE error IS NULL) as successful
   FROM request_logs
   WHERE path LIKE '%user_profiles%';
   ```

2. **403 Error Rate**
   ```sql
   SELECT COUNT(*) FROM request_logs
   WHERE status_code = 403
   AND created_at > NOW() - INTERVAL '1 hour';
   ```

3. **Role Distribution**
   ```sql
   SELECT role, COUNT(*)
   FROM user_profiles
   GROUP BY role;
   ```

---

## 🔄 ROLLBACK PROCEDURE

If issues occur, rollback with:

```sql
BEGIN;

-- Drop new policies
DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON public.user_profiles;

DROP POLICY IF EXISTS "shipping_quotes_select_policy" ON public.shipping_quotes;
DROP POLICY IF EXISTS "shipping_quotes_insert_policy" ON public.shipping_quotes;
DROP POLICY IF EXISTS "shipping_quotes_update_policy" ON public.shipping_quotes;
DROP POLICY IF EXISTS "shipping_quotes_delete_policy" ON public.shipping_quotes;

-- Restore old policies from previous migration
\i supabase/migrations/1758200003_auth_standardization_safe.sql
\i supabase/migrations/1757000000_enhance_shipping_quotes.sql

COMMIT;
```

---

## ❓ FAQ

### Q: Why JWT instead of database lookup?
**A:** Database lookups in RLS policies create circular dependencies. JWT claims are available in the session context without queries.

### Q: What if JWT and database role don't match?
**A:** JWT is the source of truth for authorization. Run the sync script to fix mismatches.

### Q: Do users need to log out?
**A:** Yes. JWT tokens are cached. New role claims only appear after re-authentication.

### Q: What happens to existing sessions?
**A:** They continue with old JWT until token expires or user logs out.

### Q: Can users change their own role?
**A:** No. RLS policy blocks this in WITH CHECK clause. Only admins can change roles.

---

## ✅ POST-DEPLOYMENT CHECKLIST

- [ ] Migration applied successfully
- [ ] All user roles synced to JWT
- [ ] Users notified to re-login
- [ ] Profile loading tested
- [ ] Shipping quotes loading tested
- [ ] Admin access verified
- [ ] Customer access verified
- [ ] No 403 errors in logs
- [ ] No circular dependency errors
- [ ] Performance metrics normal

---

## 📞 SUPPORT

**If you encounter issues:**

1. Check JWT claims:
   ```typescript
   const { data: { user } } = await supabase.auth.getUser()
   console.log(user.user_metadata.role)  // Should show role
   ```

2. Check RLS policies:
   ```sql
   SELECT * FROM pg_policies
   WHERE tablename IN ('user_profiles', 'shipping_quotes');
   ```

3. Check for errors:
   ```sql
   SELECT * FROM postgres_logs
   WHERE message LIKE '%RLS%'
   ORDER BY created_at DESC LIMIT 10;
   ```

---

**Implementation Complete! 🎉**

This fix follows industry best practices:
- Single source of truth (JWT)
- No circular dependencies
- Proper separation of concerns
- Secure by default
- Easy to maintain
