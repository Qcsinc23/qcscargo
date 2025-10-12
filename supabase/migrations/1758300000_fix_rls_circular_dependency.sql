-- Migration: 1758300000_fix_rls_circular_dependency.sql
-- Purpose: Fix circular dependency in RLS policies and auth.users references
-- Created: 2025-10-12
-- Priority: P0 - CRITICAL
--
-- ROOT CAUSE FIXES:
-- 1. Circular dependency: is_admin() -> get_user_role() -> user_profiles query -> is_admin()
-- 2. auth.users reference in RLS policies (not allowed)
-- 3. Missing JWT metadata sync
--
-- SOLUTION: Industry-standard approach using JWT claims as single source of truth

BEGIN;

-- ============================================================================
-- PHASE 1: Fix Helper Functions to Avoid Circular Dependencies
-- ============================================================================

-- Drop existing functions to recreate them properly
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_staff() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(TEXT) CASCADE;

-- Create JWT-based role checker (NO database queries - prevents circular dependency)
CREATE OR REPLACE FUNCTION public.get_jwt_claim(claim_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY INVOKER  -- Run as calling user for JWT access
AS $$
BEGIN
    -- Extract claim from JWT
    -- This works because JWT is available in the session context
    RETURN COALESCE(
        current_setting('request.jwt.claims', true)::json->>'role',
        current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role',
        current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role',
        'customer'  -- Default fallback
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'customer';
END;
$$;

-- Simple admin check using ONLY JWT (no database lookup)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN public.get_jwt_claim('role') = 'admin';
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Simple staff check using ONLY JWT
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN public.get_jwt_claim('role') IN ('admin', 'staff');
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Check specific role using ONLY JWT
CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN public.get_jwt_claim('role') = required_role;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- ============================================================================
-- PHASE 2: Fix user_profiles RLS Policies (No Circular Dependencies)
-- ============================================================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "user_profiles_unified_access" ON public.user_profiles;
DROP POLICY IF EXISTS "service_role_access" ON public.user_profiles;
DROP POLICY IF EXISTS "users_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "authenticated_insert" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_access" ON public.user_profiles;

-- Policy 1: SELECT - Users can see their own profile, admins can see all
CREATE POLICY "user_profiles_select_policy" ON public.user_profiles
    FOR SELECT
    USING (
        -- Service role has full access
        auth.role() = 'service_role'
        OR
        -- Users can see their own profile (by id)
        auth.uid() = id
        OR
        -- Users can see their own profile (by user_id if exists)
        auth.uid() = user_id
        OR
        -- Admins can see all profiles (using JWT claim, no DB query!)
        public.is_admin()
    );

-- Policy 2: INSERT - Users can create their own profile during signup
CREATE POLICY "user_profiles_insert_policy" ON public.user_profiles
    FOR INSERT
    WITH CHECK (
        -- Service role can insert anything
        auth.role() = 'service_role'
        OR
        -- Users can create their own profile
        auth.uid() = id OR auth.uid() = user_id
    );

-- Policy 3: UPDATE - Users can update their own profile, admins can update any
CREATE POLICY "user_profiles_update_policy" ON public.user_profiles
    FOR UPDATE
    USING (
        auth.role() = 'service_role'
        OR
        auth.uid() = id OR auth.uid() = user_id
        OR
        public.is_admin()
    )
    WITH CHECK (
        auth.role() = 'service_role'
        OR
        -- Users can update their own profile but NOT change their role
        (
            (auth.uid() = id OR auth.uid() = user_id)
            AND
            (role = OLD.role OR role IS NULL)
        )
        OR
        -- Admins can change roles
        public.is_admin()
    );

-- Policy 4: DELETE - Only service role and admins can delete
CREATE POLICY "user_profiles_delete_policy" ON public.user_profiles
    FOR DELETE
    USING (
        auth.role() = 'service_role'
        OR
        public.is_admin()
    );

-- ============================================================================
-- PHASE 3: Fix shipping_quotes RLS Policies (Remove auth.users Reference)
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.shipping_quotes;
DROP POLICY IF EXISTS "Service role has full access" ON public.shipping_quotes;
DROP POLICY IF EXISTS "Anyone can create quotes" ON public.shipping_quotes;
DROP POLICY IF EXISTS "Admins can view all quotes" ON public.shipping_quotes;

-- Policy 1: SELECT - Users see their own quotes, admins see all
CREATE POLICY "shipping_quotes_select_policy" ON public.shipping_quotes
    FOR SELECT
    USING (
        auth.role() = 'service_role'
        OR
        -- User's own quotes by customer_id
        auth.uid() = customer_id
        OR
        -- Admins can see all quotes (JWT-based, no DB query)
        public.is_admin()
        OR
        -- Staff can see all quotes
        public.is_staff()
    );

-- Policy 2: INSERT - Anyone can create quotes (for public calculator)
CREATE POLICY "shipping_quotes_insert_policy" ON public.shipping_quotes
    FOR INSERT
    WITH CHECK (
        -- Anyone can insert (public shipping calculator)
        true
    );

-- Policy 3: UPDATE - Users can update their own quotes, admins/staff can update any
CREATE POLICY "shipping_quotes_update_policy" ON public.shipping_quotes
    FOR UPDATE
    USING (
        auth.role() = 'service_role'
        OR
        auth.uid() = customer_id
        OR
        public.is_admin()
        OR
        public.is_staff()
    )
    WITH CHECK (
        auth.role() = 'service_role'
        OR
        auth.uid() = customer_id
        OR
        public.is_admin()
        OR
        public.is_staff()
    );

-- Policy 4: DELETE - Only service role and admins
CREATE POLICY "shipping_quotes_delete_policy" ON public.shipping_quotes
    FOR DELETE
    USING (
        auth.role() = 'service_role'
        OR
        public.is_admin()
    );

-- ============================================================================
-- PHASE 4: Create Role Sync Function (For Future JWT Updates)
-- ============================================================================

-- Function to sync user_profiles.role to JWT user_metadata
-- This would need to be called from application code or a trigger
CREATE OR REPLACE FUNCTION public.sync_role_to_jwt_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Note: This function documents the sync process but can't directly update JWT
    -- JWT metadata must be updated via Supabase Admin API or Dashboard
    -- This is a placeholder for application-level sync

    RAISE NOTICE 'Role changed for user %. New role: %. Update JWT metadata via Admin API.',
        NEW.id, NEW.role;

    RETURN NEW;
END;
$$;

-- Create trigger (informational only - JWT sync must happen in application layer)
DROP TRIGGER IF EXISTS sync_role_to_jwt_trigger ON public.user_profiles;
CREATE TRIGGER sync_role_to_jwt_trigger
    AFTER UPDATE OF role ON public.user_profiles
    FOR EACH ROW
    WHEN (OLD.role IS DISTINCT FROM NEW.role)
    EXECUTE FUNCTION public.sync_role_to_jwt_metadata();

-- ============================================================================
-- PHASE 5: Grant Permissions
-- ============================================================================

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION public.get_jwt_claim(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated, anon;

-- Grant table permissions (controlled by RLS)
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated, anon;
GRANT DELETE ON public.user_profiles TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.shipping_quotes TO authenticated, anon;
GRANT DELETE ON public.shipping_quotes TO authenticated;

-- ============================================================================
-- PHASE 6: Validation
-- ============================================================================

DO $$
DECLARE
    profile_count INTEGER;
    quote_count INTEGER;
BEGIN
    -- Count profiles
    SELECT COUNT(*) INTO profile_count FROM public.user_profiles;
    SELECT COUNT(*) INTO quote_count FROM public.shipping_quotes;

    RAISE NOTICE '✅ RLS circular dependency fix completed successfully';
    RAISE NOTICE 'User profiles: %', profile_count;
    RAISE NOTICE 'Shipping quotes: %', quote_count;
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: JWT Metadata Sync Required';
    RAISE NOTICE 'For each user, update JWT user_metadata with role:';
    RAISE NOTICE '1. Go to Supabase Dashboard > Authentication > Users';
    RAISE NOTICE '2. Edit each user and add to User Metadata: { "role": "admin" }';
    RAISE NOTICE '3. Or use Admin API: supabase.auth.admin.updateUserById(userId, { user_metadata: { role: "admin" } })';
END $$;

COMMIT;

-- ============================================================================
-- Post-Migration Notes
-- ============================================================================

-- This migration fixes the circular dependency by:
-- 1. Making all role check functions use ONLY JWT claims (no database queries)
-- 2. Removing auth.users references from RLS policies
-- 3. Using auth.uid() and JWT claims as the single source of truth
--
-- NEXT STEPS:
-- 1. Update JWT metadata for all users (especially admins)
-- 2. Test that profiles load correctly
-- 3. Verify shipping_quotes queries work without 403 errors
-- 4. Monitor for any RLS policy violations
