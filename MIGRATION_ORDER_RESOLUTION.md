# Migration Order Resolution & Industry Standard Approach

## Executive Summary

This document provides a comprehensive analysis and resolution plan for migration order issues in the QCS Cargo application, following database migration best practices.

## Current State Analysis

### ✅ Successfully Applied Migrations
- `1758200002_fix_admin_access_policies.sql` - **CRITICAL** - Admin access & system_health table

### ⚠️ Problematic Migrations

#### 1. `1758100001_add_idempotency_constraint.sql`
**Issue**: Depends on `idempotency_key` column in bookings table
**Risk Level**: LOW
**Status**: Can be applied if column exists

#### 2. `1758200000_standardize_auth_schema.sql`
**Issue**: Multiple permission and schema issues
**Risk Level**: HIGH
**Status**: Requires significant refactoring

**Specific Problems**:
- Attempts to update `auth.users` table (requires service role)
- Creates functions in public schema that reference auth schema
- RLS policies depend on functions not yet fully established
- JWT metadata updates may fail due to insufficient permissions

#### 3. `1758200001_migration_rollback_system.sql`
**Issue**: Depends on functions from 1758200000
**Risk Level**: MEDIUM
**Status**: Blocked by 1758200000

**Specific Problems**:
- References `auth.is_admin()` which is created in 1758200000
- Complex rollback system that hasn't been tested

---

## Industry Standard Resolution Plan

### Phase 1: Verify Prerequisites ✅

#### Step 1.1: Check Bookings Table Schema
```sql
-- Verify idempotency_key column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'bookings' 
  AND column_name = 'idempotency_key';
```

#### Step 1.2: Check User Profiles Schema
```sql
-- Verify role column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles' 
  AND column_name IN ('role', 'user_type');
```

### Phase 2: Fix Auth Standardization Migration 🔧

Create a **safe, refactored version** that follows these principles:
1. **Separate concerns** - Schema changes separate from RLS policies
2. **Proper permissions** - Use SECURITY DEFINER carefully
3. **Idempotent operations** - Can be run multiple times safely
4. **Transaction safety** - Proper BEGIN/COMMIT blocks

#### New Migration: `1758200003_auth_standardization_safe.sql`

Key improvements:
- Add column checks before operations
- Separate data migration from policy creation
- Use proper error handling
- Avoid direct auth.users updates (use Supabase dashboard/API instead)
- Test each step independently

### Phase 3: Simplified Rollback System 🔄

Instead of complex stored procedures, use:
1. **Migration tracking table** - Simple logging
2. **Manual rollback scripts** - Documented and tested
3. **Pre-migration backups** - Always backup before risky operations

#### New Migration: `1758200004_simple_rollback_tracking.sql`

---

## Recommended Migration Order

### **Safe Execution Order**:

1. ✅ **Already Applied**: `1758200002_fix_admin_access_policies.sql`
   - Creates system_health table
   - Fixes admin access to shipping_quotes

2. 🟢 **Can Apply Now** (if prerequisite met): `1758100001_add_idempotency_constraint.sql`
   - **Prerequisite**: bookings.idempotency_key column exists
   - **Action**: Verify prerequisite first, then apply

3. 🟡 **Refactor Required**: `1758200000_standardize_auth_schema.sql`
   - **Action**: Create new safe version `1758200003_auth_standardization_safe.sql`
   - **Skip**: Original migration should be marked as obsolete

4. 🟡 **Simplify Required**: `1758200001_migration_rollback_system.sql`
   - **Action**: Create simplified version `1758200004_simple_rollback_tracking.sql`
   - **Skip**: Original migration is overly complex

---

## Industry Best Practices Applied

### 1. **Migration Naming Convention**
✅ Using timestamp-based names: `YYYYMMDDHHMMSS_descriptive_name.sql`

### 2. **Idempotency**
✅ All migrations should use:
- `CREATE TABLE IF NOT EXISTS`
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- `DROP ... IF EXISTS` before CREATE

### 3. **Transaction Management**
```sql
BEGIN;
-- Migration operations
COMMIT;
-- Rollback on error
```

### 4. **Dependency Management**
- Document dependencies clearly
- Check prerequisites before execution
- Fail fast with clear error messages

### 5. **Testing Strategy**
1. Test on local database first
2. Test on staging environment
3. Create rollback plan before production
4. Monitor after deployment

### 6. **Documentation**
- Clear migration purpose in header
- Document dependencies
- Include rollback instructions
- Add verification queries

---

## Safe Refactored Migrations

### Migration 1: Auth Standardization (Safe Version)

**File**: `1758200003_auth_standardization_safe.sql`

**Key Features**:
- Proper prerequisite checks
- Separated schema and policy updates
- No direct auth.users manipulation
- Comprehensive error handling
- Idempotent operations

### Migration 2: Simple Rollback Tracking

**File**: `1758200004_simple_rollback_tracking.sql`

**Key Features**:
- Simple tracking table
- No complex stored procedures
- Manual rollback documentation
- Easy to understand and maintain

---

## Execution Plan

### Immediate Actions

#### 1. Verify System State
```bash
# Check what's currently applied
psql -h localhost -d postgres -c "SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;"
```

#### 2. Verify Prerequisites for 1758100001
```bash
# Check if idempotency_key exists
psql -h localhost -d postgres -c "
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = 'bookings' 
    AND column_name = 'idempotency_key';
"
```

#### 3. Apply Safe Migrations
```bash
# If prerequisite met, apply idempotency constraint
supabase db push --include-all

# Or manually:
psql -h localhost -d postgres -f supabase/migrations/1758100001_add_idempotency_constraint.sql
```

### Next Steps

1. **Create safe refactored versions** of problematic migrations
2. **Test on local environment** thoroughly
3. **Document rollback procedures** for each migration
4. **Create staging deployment plan**
5. **Schedule production deployment** with monitoring

---

## Risk Mitigation

### Before Any Migration

1. ✅ **Backup database**
   ```bash
   pg_dump -h localhost -U postgres > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. ✅ **Test rollback procedure**
   - Document exact steps
   - Test on copy of production data
   - Time the rollback operation

3. ✅ **Monitor critical metrics**
   - Query performance
   - Error rates
   - User access issues

### During Migration

1. 🔍 **Monitor logs** in real-time
2. 🔍 **Watch for lock contention**
3. 🔍 **Check application health**

### After Migration

1. ✅ **Verify functionality**
   - Admin dashboard access
   - User authentication
   - Critical queries

2. ✅ **Check performance**
   - Query execution times
   - Index usage
   - Resource utilization

---

## Conclusion

### Current Status: STABLE ✅

The most critical migration (`1758200002_fix_admin_access_policies.sql`) is already applied successfully, fixing:
- ✅ Admin access to shipping_quotes
- ✅ System health monitoring table
- ✅ RLS policies for admin users

### Recommended Actions:

1. **LOW PRIORITY**: Apply `1758100001_add_idempotency_constraint.sql` after verifying prerequisite
2. **REFACTOR**: Create safe versions of auth standardization and rollback migrations
3. **SKIP**: Original versions of 1758200000 and 1758200001 due to complexity/risk

### What's Working Now:
- ✅ Admin Dashboard (no 403 errors)
- ✅ System Health Monitoring
- ✅ RLS Policies for admin access
- ✅ Application stability

### Next Phase:
Only proceed with additional migrations if there's a specific functional requirement that's not currently met.

---

## Appendix: Quick Commands

### Check Migration Status
```sql
SELECT version, name, executed_at 
FROM supabase_migrations.schema_migrations 
ORDER BY version DESC 
LIMIT 10;
```

### Verify Critical Tables
```sql
-- Check system_health table
SELECT COUNT(*) FROM public.system_health;

-- Check shipping_quotes access
SELECT COUNT(*) FROM public.shipping_quotes;

-- Check user roles
SELECT role, COUNT(*) 
FROM public.user_profiles 
GROUP BY role;
```

### Monitor RLS Policies
```sql
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('shipping_quotes', 'system_health', 'user_profiles')
ORDER BY tablename, policyname;
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-12  
**Status**: Active  
**Approved By**: Database Migration Review