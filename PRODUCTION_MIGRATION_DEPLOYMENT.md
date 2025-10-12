# Production Migration Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the safe authentication migrations to your production/staging Supabase environment.

## Prerequisites

✅ Production environment has base tables (user_profiles, shipping_quotes, etc.)  
✅ You have admin access to Supabase Dashboard  
✅ You have created a backup (automatic or manual)  
✅ Staging environment available for testing (recommended)

## Deployment Strategy

### Phase 1: Staging Deployment (Recommended First)
### Phase 2: Production Deployment (After Staging Success)

---

## Phase 1: Staging Deployment

### Step 1: Connect to Staging

```bash
# Link to your staging project
supabase link --project-ref YOUR_STAGING_PROJECT_REF

# Verify connection
supabase projects list
```

### Step 2: Create Backup

Supabase automatically creates backups, but verify:

1. Go to Supabase Dashboard → Your Project → Database → Backups
2. Confirm recent backup exists
3. Or manually create: Settings → Database → Backup now

### Step 3: Run Pre-Migration Check

```bash
# Connect to staging database
supabase db remote connect

# In the psql session, run:
\i supabase/migrations/test_migration_prerequisites.sql
```

**Expected Results:**
- ✅ user_profiles table exists
- ⚠️ role column may not exist (will be created)
- ✅ Database permissions OK

### Step 4: Apply Migrations to Staging

```bash
# Apply auth standardization
supabase db push --include 1758200003_auth_standardization_safe.sql

# Apply rollback tracking
supabase db push --include 1758200004_simple_rollback_tracking.sql
```

Or manually via SQL Editor in Supabase Dashboard:

1. Go to SQL Editor
2. Copy content from `supabase/migrations/1758200003_auth_standardization_safe.sql`
3. Execute
4. Repeat for `1758200004_simple_rollback_tracking.sql`

### Step 5: Verify Staging Deployment

```bash
# Connect to staging
supabase db remote connect

# Run verification
\i supabase/migrations/test_migration_success.sql
```

**Success Criteria:**
- ✅ Migration tracking system active
- ✅ Auth functions created (get_user_role, is_admin, is_staff)
- ✅ All users have roles assigned
- ✅ RLS policies configured

### Step 6: Test Staging Application

1. **Admin Dashboard**
   - Login as admin user
   - Navigate to admin dashboard
   - Verify no 403 errors
   - Check shipping quotes visible
   - Test system health monitoring

2. **User Authentication**
   - Login as regular user
   - Verify profile access
   - Test permissions
   - Create/view shipments

3. **Performance Check**
   - Monitor query performance
   - Check RLS policy overhead
   - Verify no slowdowns

### Step 7: Monitor Staging (24-48 hours)

```sql
-- Check for errors
SELECT * FROM auth.audit_log_entries 
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND data->>'error' IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- Monitor slow queries
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
WHERE query LIKE '%user_profiles%'
   OR query LIKE '%is_admin%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Verify migration tracking
SELECT * FROM migration_overview 
ORDER BY applied_at DESC;
```

---

## Phase 2: Production Deployment

### ⚠️ ONLY PROCEED IF STAGING IS SUCCESSFUL

### Production Deployment Window

**Recommended:** Low-traffic period (e.g., late night/early morning)

**Estimated Downtime:** < 5 minutes (migrations are fast)

### Step 1: Pre-Deployment Checklist

- [ ] Staging deployment successful for 24+ hours
- [ ] No errors in staging logs
- [ ] Performance verified on staging
- [ ] Team notified of deployment
- [ ] Rollback plan reviewed
- [ ] Backup verified (auto-backup exists)
- [ ] Emergency contact list ready

### Step 2: Connect to Production

```bash
# Link to production project
supabase link --project-ref YOUR_PRODUCTION_PROJECT_REF

# Verify connection (CRITICAL - confirm it's production)
supabase projects list
```

### Step 3: Final Backup Verification

1. Supabase Dashboard → Production Project → Database → Backups
2. Confirm automatic backup < 24 hours old
3. Optionally trigger manual backup: Settings → Database → Backup now

### Step 4: Run Pre-Migration Check

```bash
# Connect to production
supabase db remote connect

# Verify prerequisites
\i supabase/migrations/test_migration_prerequisites.sql
```

### Step 5: Apply Migrations

**Option A: Using Supabase CLI (Recommended)**

```bash
# Apply both migrations
supabase db push --include 1758200003_auth_standardization_safe.sql
supabase db push --include 1758200004_simple_rollback_tracking.sql
```

**Option B: Using SQL Editor**

1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/1758200003_auth_standardization_safe.sql`
3. Copy entire content
4. Paste in SQL Editor
5. Execute
6. Wait for "Success" message
7. Repeat for `1758200004_simple_rollback_tracking.sql`

### Step 6: Immediate Verification

```bash
# Connect to production
supabase db remote connect

# Run verification script
\i supabase/migrations/test_migration_success.sql
```

**Critical Checks:**
```sql
-- Verify auth functions exist
SELECT proname FROM pg_proc WHERE proname IN ('get_user_role', 'is_admin', 'is_staff');

-- Check all users have roles
SELECT COUNT(*) as total_users,
       COUNT(role) as users_with_roles,
       COUNT(*) - COUNT(role) as missing_roles
FROM user_profiles;

-- Verify RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('user_profiles', 'shipping_quotes', 'system_health')
ORDER BY tablename;
```

### Step 7: Application Smoke Test

**Immediate (< 5 minutes):**
1. Login as admin - MUST work
2. Access admin dashboard - NO 403 errors
3. View shipping quotes - Must be visible
4. Login as regular user - Must work
5. View own profile - Must work

**If ANY test fails → ROLLBACK IMMEDIATELY**

### Step 8: Monitor Production (First Hour)

```sql
-- Watch for errors
SELECT * FROM auth.audit_log_entries 
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND data->>'error' IS NOT NULL
ORDER BY created_at DESC;

-- Monitor query performance
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
WHERE query LIKE '%is_admin%' 
   OR query LIKE '%get_user_role%'
ORDER BY calls DESC
LIMIT 20;
```

### Step 9: Extended Monitoring (24-48 hours)

- Monitor error rates in Supabase Dashboard
- Check application logs for authentication issues
- Verify no performance degradation
- Confirm user reports (if any)

---

## Rollback Procedures

### If Issues Occur Within First Hour

**Quick Rollback (< 2 minutes):**

```sql
-- Connect to production
-- supabase db remote connect

BEGIN;

-- Rollback tracking system
DROP VIEW IF EXISTS migration_overview;
DROP TABLE IF EXISTS migration_history CASCADE;
DROP FUNCTION IF EXISTS register_migration(TEXT, TEXT, TEXT, TEXT[]);
DROP FUNCTION IF EXISTS list_migrations(TEXT);
DROP FUNCTION IF EXISTS get_rollback_notes(TEXT);
DROP FUNCTION IF EXISTS check_migration_dependencies(TEXT);

-- Rollback auth standardization
DROP POLICY IF EXISTS "user_profiles_unified_access" ON user_profiles;
DROP FUNCTION IF EXISTS get_user_role();
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_staff();
DROP FUNCTION IF EXISTS has_role(TEXT);

-- Restore old policies (if they existed)
CREATE POLICY "service_role_access" ON user_profiles
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "users_own_profile" ON user_profiles
    FOR ALL USING (auth.uid() = id);

COMMIT;
```

### If Issues Occur After Extended Period

**Restore from Backup:**

1. Supabase Dashboard → Database → Backups
2. Select backup from before migration
3. Click "Restore"
4. Wait for restoration (5-15 minutes)
5. Verify application functionality

---

## Post-Deployment Checklist

### Day 1 (Deployment Day)
- [ ] All smoke tests passed
- [ ] No critical errors in logs
- [ ] Admin dashboard accessible
- [ ] User authentication working
- [ ] Performance within normal range

### Week 1
- [ ] Error rate normal
- [ ] No user complaints
- [ ] Performance stable
- [ ] RLS policies effective
- [ ] Migration tracking working

### Documentation
- [ ] Update deployment log
- [ ] Document any issues encountered
- [ ] Update runbook if needed
- [ ] Share results with team

---

## Emergency Contacts

**If Deployment Issues Occur:**

1. **Immediate Rollback** - Use rollback SQL above
2. **Restore from Backup** - Supabase Dashboard
3. **Team Notification** - Alert relevant stakeholders
4. **Support** - Create Supabase support ticket if needed

---

## Success Metrics

### Technical Metrics
- ✅ Zero migration errors
- ✅ All auth functions operational
- ✅ 100% users with role assignments
- ✅ RLS policies active
- ✅ Query performance < 10% overhead

### Business Metrics
- ✅ Zero user-reported auth issues
- ✅ Admin dashboard 100% available
- ✅ No increase in error rates
- ✅ System health monitoring active

---

## Migration Details

### What Gets Changed

**Tables Modified:**
- `user_profiles` - Adds role column if missing
- Creates `migration_history` table
- Creates `system_health` table (if applying 1758200002)

**Functions Created:**
- `public.get_user_role()` - Gets user role from database
- `public.is_admin()` - Checks if user is admin
- `public.is_staff()` - Checks if user is staff/admin
- `public.has_role(TEXT)` - Checks specific role
- `public.register_migration()` - Registers migrations
- `public.list_migrations()` - Lists applied migrations
- `public.get_rollback_notes()` - Gets rollback instructions
- `public.check_migration_dependencies()` - Checks dependencies

**RLS Policies:**
- Updates `user_profiles` RLS policies
- Adds policies for `migration_history`
- Adds policies for `system_health` (if applying 1758200002)

### What Does NOT Get Changed

- ❌ No changes to auth.users table
- ❌ No JWT metadata modifications
- ❌ No existing user data modifications
- ❌ No breaking changes to API
- ❌ No application code changes required

---

## Frequently Asked Questions

### Q: Do users need to re-login after migration?
**A:** No, existing sessions remain valid.

### Q: Will this cause downtime?
**A:** Minimal (< 1 minute). Migrations execute quickly.

### Q: Can this be rolled back?
**A:** Yes, full rollback SQL provided above.

### Q: Do I need to modify application code?
**A:** No, migrations are transparent to application.

### Q: What if a user is mid-transaction during migration?
**A:** Transaction will complete normally. New sessions use new policies.

---

## Conclusion

This deployment strategy prioritizes safety through:
- ✅ Staging verification first
- ✅ Automatic backups verified
- ✅ Quick rollback procedures
- ✅ Comprehensive monitoring
- ✅ Clear success criteria

Follow this guide step-by-step for a safe, successful deployment.

---

**Last Updated:** 2025-10-12  
**Version:** 1.0  
**Status:** Production Ready