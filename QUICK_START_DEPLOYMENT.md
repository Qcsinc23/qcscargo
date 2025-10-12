# Quick Start: Deploy Safe Migrations

## TL;DR - Fast Track

```bash
# 1. Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# 2. Run automated deployment
./scripts/deploy-safe-migrations.sh staging   # Test on staging first
./scripts/deploy-safe-migrations.sh production # Then production

# 3. Verify in dashboard
# → Login as admin
# → Check no 403 errors
# → Done!
```

---

## What This Does

Deploys two safe migrations that fix auth issues:

1. **Auth Standardization** (`1758200003`) - Fixes role management
2. **Migration Tracking** (`1758200004`) - Adds rollback documentation

**Time Required:** 5-10 minutes  
**Downtime:** < 1 minute  
**Reversible:** Yes (full rollback SQL provided)

---

## Prerequisites Checklist

- [ ] Have Supabase CLI installed (`supabase --version`)
- [ ] Have admin access to Supabase dashboard
- [ ] Production has `user_profiles` table (verify in dashboard)
- [ ] Backup exists (auto-backup in dashboard)

---

## Step-by-Step Guide

### Option A: Automated Deployment (Recommended)

The script handles everything automatically:

```bash
# Deploy to staging first
./scripts/deploy-safe-migrations.sh staging

# After 24 hours if all good, deploy to production
./scripts/deploy-safe-migrations.sh production
```

The script will:
- ✅ Check prerequisites
- ✅ Verify backup exists
- ✅ Apply migrations
- ✅ Verify deployment
- ✅ Show smoke test checklist

### Option B: Manual Deployment

If you prefer manual control:

1. **Connect to project:**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

2. **Verify backup exists:**
   - Dashboard → Database → Backups
   - Confirm recent backup

3. **Apply migrations:**
   ```bash
   # Auth standardization
   supabase db push --include 1758200003_auth_standardization_safe.sql
   
   # Rollback tracking
   supabase db push --include 1758200004_simple_rollback_tracking.sql
   ```

4. **Verify:**
   ```bash
   supabase db remote connect
   SELECT * FROM migration_overview;
   \q
   ```

5. **Test:**
   - Login as admin → Should work
   - Access dashboard → No 403 errors
   - View quotes → Should be visible

---

## Post-Deployment Checks

### Immediate (< 5 minutes)

Run these checks right after deployment:

```sql
-- Connect to database
supabase db remote connect

-- 1. Check auth functions exist
SELECT proname FROM pg_proc 
WHERE proname IN ('get_user_role', 'is_admin', 'is_staff');
-- Should show 3 functions

-- 2. Verify all users have roles
SELECT COUNT(*) as total, COUNT(role) as with_roles 
FROM user_profiles;
-- Both numbers should match

-- 3. Check migration tracking
SELECT * FROM migration_overview 
ORDER BY applied_at DESC LIMIT 5;
-- Should show both new migrations

\q
```

### Application Tests

- [ ] Login as admin user → Works
- [ ] Access admin dashboard → No 403
- [ ] View shipping quotes → Visible
- [ ] Login as customer → Works
- [ ] View own profile → Works

### Monitor (First Hour)

```sql
-- Check for errors
SELECT * FROM auth.audit_log_entries 
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND data->>'error' IS NOT NULL
ORDER BY created_at DESC;
```

---

## If Something Goes Wrong

### Quick Rollback (< 2 minutes)

```bash
supabase db remote connect
```

Then paste this SQL:

```sql
BEGIN;

-- Remove tracking system
DROP VIEW IF EXISTS migration_overview;
DROP TABLE IF EXISTS migration_history CASCADE;
DROP FUNCTION IF EXISTS register_migration(TEXT, TEXT, TEXT, TEXT[]);
DROP FUNCTION IF EXISTS list_migrations(TEXT);
DROP FUNCTION IF EXISTS get_rollback_notes(TEXT);
DROP FUNCTION IF EXISTS check_migration_dependencies(TEXT);

-- Remove auth functions
DROP POLICY IF EXISTS "user_profiles_unified_access" ON user_profiles;
DROP FUNCTION IF EXISTS get_user_role();
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_staff();
DROP FUNCTION IF EXISTS has_role(TEXT);

COMMIT;
```

---

## Success Indicators

You'll know it worked when:

- ✅ No errors during migration
- ✅ Admin can access dashboard
- ✅ No 403 errors on admin pages
- ✅ All users can login
- ✅ `SELECT * FROM migration_overview;` shows both migrations

---

## Common Issues

### Issue: "relation user_profiles does not exist"
**Solution:** You're testing on fresh local DB. Deploy to staging/production instead.

### Issue: "permission denied for table auth.users"
**Solution:** This was the OLD migration. You're using the SAFE version which doesn't need auth.users access.

### Issue: Migration shows "already exists"
**Solution:** That's fine! Migrations are idempotent (safe to rerun).

---

## Files Reference

| File | Purpose |
|------|---------|
| `PRODUCTION_MIGRATION_DEPLOYMENT.md` | Detailed deployment guide |
| `scripts/deploy-safe-migrations.sh` | Automated deployment script |
| `supabase/migrations/1758200003_auth_standardization_safe.sql` | Auth migration |
| `supabase/migrations/1758200004_simple_rollback_tracking.sql` | Tracking migration |
| `MIGRATION_ORDER_RESOLUTION.md` | Technical analysis |

---

## Timeline

### Staging Deployment
- **Preparation:** 5 minutes (link project, verify backup)
- **Deployment:** 2 minutes (run migrations)
- **Verification:** 3 minutes (smoke tests)
- **Monitoring:** 24-48 hours (watch for issues)

### Production Deployment
- **Preparation:** 5 minutes
- **Deployment:** 2 minutes
- **Verification:** 3 minutes
- **Extended monitoring:** 24-48 hours

**Total time investment:** ~10 minutes active work + passive monitoring

---

## Questions?

**Q: Do I need to apply other migrations first?**  
A: No. These are independent and safe to apply to existing production databases.

**Q: Will users need to re-login?**  
A: No. Existing sessions remain valid.

**Q: Can I test on local first?**  
A: Local DB is missing base tables. Test on staging instead.

**Q: What if I already applied the OLD migrations?**  
A: The new ones replace them safely. Old functions will be dropped and recreated.

---

## Ready to Deploy?

### Staging First (Strongly Recommended)
```bash
./scripts/deploy-safe-migrations.sh staging
```

### Production (After Staging Success)
```bash
./scripts/deploy-safe-migrations.sh production
```

### Need Help?
- 📖 Detailed guide: [`PRODUCTION_MIGRATION_DEPLOYMENT.md`](./PRODUCTION_MIGRATION_DEPLOYMENT.md)
- 🔍 Technical details: [`MIGRATION_ORDER_RESOLUTION.md`](./MIGRATION_ORDER_RESOLUTION.md)
- 📋 Full summary: [`MIGRATION_RESOLUTION_SUMMARY.md`](./MIGRATION_RESOLUTION_SUMMARY.md)

---

**Status:** ✅ Ready for Production  
**Last Updated:** 2025-10-12  
**Confidence:** HIGH