# Migration Execution Guide

## Overview

This guide provides step-by-step instructions for safely applying database migrations to resolve the migration order issues identified in the QCS Cargo application.

## Quick Reference

### Migration Files Status

| Migration | Status | Priority | Safe to Apply |
|-----------|--------|----------|---------------|
| `1758200002_fix_admin_access_policies.sql` | ✅ Applied | CRITICAL | - |
| `1758100001_add_idempotency_constraint.sql` | 🟡 Pending | LOW | ✅ Yes (if prereq met) |
| `1758200003_auth_standardization_safe.sql` | 🆕 New | HIGH | ✅ Yes |
| `1758200004_simple_rollback_tracking.sql` | 🆕 New | MEDIUM | ✅ Yes |
| `1758200000_standardize_auth_schema.sql` | ❌ Skip | - | ❌ No (use 1758200003) |
| `1758200001_migration_rollback_system.sql` | ❌ Skip | - | ❌ No (use 1758200004) |

---

## Prerequisites

### 1. Environment Verification

```bash
# Check Supabase connection
supabase status

# Verify you're connected to the correct project
supabase projects list
```

### 2. Create Backup

**CRITICAL: Always backup before migrations**

```bash
# Local backup
pg_dump -h localhost -U postgres -d postgres > backup_$(date +%Y%m%d_%H%M%S).sql

# Or use Supabase CLI
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql
```

### 3. Run Prerequisite Tests

```bash
# Run prerequisite verification
psql -h localhost -d postgres -f supabase/migrations/test_migration_prerequisites.sql
```

Review the output carefully. Look for:
- ✅ Green checkmarks indicate ready to proceed
- ⚠️ Yellow warnings indicate caution needed
- ❌ Red errors indicate blockers

---

## Execution Steps

### Step 1: Verify Current State

```bash
# Check what migrations are currently applied
supabase db diff

# Or directly query the database
psql -h localhost -d postgres -c "
  SELECT version, name, executed_at 
  FROM supabase_migrations.schema_migrations 
  ORDER BY version DESC 
  LIMIT 10;
"
```

### Step 2: Apply Migrations in Order

#### Migration 2A (Optional): Idempotency Constraint

**Only if `bookings.idempotency_key` column exists**

```bash
# Verify prerequisite
psql -h localhost -d postgres -c "
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = 'bookings' 
    AND column_name = 'idempotency_key';
"
```

If column exists:
```bash
supabase migration up --file 1758100001_add_idempotency_constraint.sql

# Or manually:
psql -h localhost -d postgres -f supabase/migrations/1758100001_add_idempotency_constraint.sql
```

**Verification:**
```sql
-- Check constraint was created
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'bookings' 
  AND constraint_name = 'unique_idempotency_key';
```

#### Migration 2B: Safe Auth Standardization

```bash
# Apply auth standardization
supabase migration up --file 1758200003_auth_standardization_safe.sql

# Or manually:
psql -h localhost -d postgres -f supabase/migrations/1758200003_auth_standardization_safe.sql
```

**Verification:**
```sql
-- Check role column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND column_name = 'role';

-- Check functions were created
SELECT proname 
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND proname IN ('get_user_role', 'is_admin', 'is_staff');

-- Verify all users have roles
SELECT COUNT(*) as total, 
       COUNT(role) as with_roles 
FROM user_profiles;
```

#### Migration 2C: Simple Rollback Tracking

```bash
# Apply rollback tracking system
supabase migration up --file 1758200004_simple_rollback_tracking.sql

# Or manually:
psql -h localhost -d postgres -f supabase/migrations/1758200004_simple_rollback_tracking.sql
```

**Verification:**
```sql
-- Check migration_history table exists
SELECT tablename 
FROM pg_tables 
WHERE tablename = 'migration_history';

-- View registered migrations
SELECT * FROM migration_overview ORDER BY applied_at DESC;
```

### Step 3: Run Post-Migration Tests

```bash
# Run comprehensive verification
psql -h localhost -d postgres -f supabase/migrations/test_migration_success.sql
```

Review output for any warnings or errors.

### Step 4: Verify Application Functionality

#### Test Admin Dashboard
1. Log in as admin user
2. Navigate to admin dashboard
3. Verify no 403 errors
4. Check shipping quotes are visible
5. Verify system health monitoring works

#### Test User Authentication
1. Log in as regular user
2. Verify profile access
3. Check permissions are correct
4. Test creating shipments/bookings

---

## Troubleshooting

### Issue: Migration Fails with Permission Error

**Symptom:**
```
ERROR: permission denied for table auth.users
```

**Solution:**
This is expected for the OLD migration `1758200000`. Use the safe version `1758200003` instead, which doesn't require auth.users access.

### Issue: Function Already Exists

**Symptom:**
```
ERROR: function "get_user_role" already exists
```

**Solution:**
The migration is idempotent. Either:
1. The function exists from a previous run (OK - continue)
2. Drop and recreate:
   ```sql
   DROP FUNCTION IF EXISTS public.get_user_role();
   DROP FUNCTION IF EXISTS public.is_admin();
   DROP FUNCTION IF EXISTS public.is_staff();
   ```
   Then re-run the migration.

### Issue: RLS Policy Conflicts

**Symptom:**
```
ERROR: policy "user_profiles_access" already exists
```

**Solution:**
```sql
-- Drop old policies
DROP POLICY IF EXISTS "service_role_access" ON public.user_profiles;
DROP POLICY IF EXISTS "users_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "authenticated_insert" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_access" ON public.user_profiles;
```
Then re-run the migration.

### Issue: Users Missing Roles After Migration

**Symptom:**
Some users don't have roles assigned after auth standardization.

**Solution:**
```sql
-- Fix missing roles
UPDATE public.user_profiles 
SET role = 'customer' 
WHERE role IS NULL;

-- Verify fix
SELECT COUNT(*) FROM user_profiles WHERE role IS NULL;
```

---

## Rollback Procedures

### If Auth Standardization Needs Rollback

```sql
BEGIN;

-- Drop unified policy
DROP POLICY IF EXISTS "user_profiles_unified_access" ON public.user_profiles;

-- Drop auth functions
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_staff();
DROP FUNCTION IF EXISTS public.has_role(TEXT);

-- Optionally remove role column (data preserved)
-- ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS role;

COMMIT;
```

### If Rollback Tracking Needs Rollback

```sql
BEGIN;

DROP VIEW IF EXISTS public.migration_overview;
DROP TABLE IF EXISTS public.migration_history CASCADE;
DROP FUNCTION IF EXISTS public.register_migration(TEXT, TEXT, TEXT, TEXT[]);
DROP FUNCTION IF EXISTS public.list_migrations(TEXT);
DROP FUNCTION IF EXISTS public.get_rollback_notes(TEXT);
DROP FUNCTION IF EXISTS public.check_migration_dependencies(TEXT);

COMMIT;
```

### Get Rollback Instructions from System

```sql
-- List all migrations with rollback notes
SELECT migration_name, 
       CASE WHEN rollback_notes IS NOT NULL 
            THEN '✅ Available' 
            ELSE '❌ Missing' 
       END as rollback_status
FROM migration_history
ORDER BY applied_at DESC;

-- Get specific rollback instructions
SELECT public.get_rollback_notes('1758200003_auth_standardization_safe');
```

---

## Post-Deployment Checklist

### Immediate Checks (0-5 minutes)

- [ ] All migrations applied successfully
- [ ] No error messages in migration output
- [ ] Post-migration tests pass
- [ ] Admin dashboard accessible
- [ ] No 403 errors on admin pages

### Short-term Checks (5-30 minutes)

- [ ] User authentication working
- [ ] Profile updates functioning
- [ ] Shipping quotes visible to admins
- [ ] System health monitoring active
- [ ] No unusual errors in logs

### Long-term Monitoring (24-48 hours)

- [ ] Monitor error rates
- [ ] Check query performance
- [ ] Verify RLS policies not causing slowdowns
- [ ] Confirm no authentication issues
- [ ] Review application logs

---

## Monitoring Queries

### Check Migration Status
```sql
-- View all applied migrations
SELECT * FROM migration_overview ORDER BY applied_at DESC;

-- Check for failed migrations
SELECT * FROM migration_history WHERE status != 'applied';
```

### Check Auth Functions
```sql
-- Test auth functions
SELECT public.get_user_role();
SELECT public.is_admin();

-- Check function usage
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE definition LIKE '%is_admin%' OR definition LIKE '%get_user_role%';
```

### Check RLS Policies
```sql
-- List all RLS policies
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('user_profiles', 'shipping_quotes', 'system_health')
ORDER BY tablename, policyname;
```

### Monitor Performance
```sql
-- Check slow queries related to RLS
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
WHERE query LIKE '%user_profiles%' 
   OR query LIKE '%is_admin%'
   OR query LIKE '%get_user_role%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## Best Practices

### Before Any Migration

1. **Always backup** - No exceptions
2. **Test on staging** - If available
3. **Read migration thoroughly** - Understand what it does
4. **Check dependencies** - Ensure prerequisites are met
5. **Plan rollback** - Know how to undo changes

### During Migration

1. **Monitor closely** - Watch for errors
2. **Check logs** - Review output carefully
3. **Don't interrupt** - Let migration complete
4. **Document issues** - Note any warnings

### After Migration

1. **Verify immediately** - Run test scripts
2. **Test functionality** - Check key features
3. **Monitor performance** - Watch for slowdowns
4. **Document completion** - Update tracking

---

## Emergency Contacts

### If Something Goes Wrong

1. **Don't panic** - Most issues are recoverable
2. **Stop application** - Prevent further damage
3. **Restore from backup** - If needed
4. **Document the issue** - For post-mortem
5. **Seek help** - Contact team/support

### Quick Restore Command

```bash
# If you need to restore from backup
psql -h localhost -U postgres -d postgres < backup_YYYYMMDD_HHMMSS.sql
```

---

## Additional Resources

- [MIGRATION_ORDER_RESOLUTION.md](./MIGRATION_ORDER_RESOLUTION.md) - Detailed analysis
- [Supabase Migration Docs](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL Migration Best Practices](https://www.postgresql.org/docs/current/sql-altertable.html)

---

## Success Criteria

### ✅ Migration Successful When:

1. All planned migrations applied without errors
2. Post-migration tests pass completely
3. Admin dashboard accessible with no 403 errors
4. System health monitoring functional
5. User authentication working normally
6. No performance degradation observed
7. Application functionality verified
8. Rollback procedures documented and tested

---

**Last Updated:** 2025-10-12  
**Version:** 1.0  
**Status:** Production Ready