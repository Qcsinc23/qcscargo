-- Migration: 1759500000_verify_quotes_rls_and_bulk_support.sql
-- Purpose: Verify and ensure RLS policies for shipping_quotes and ensure bulk update support

-- ============================================================================
-- PART 1: Verify shipping_quotes table exists and has required columns
-- ============================================================================

DO $$
BEGIN
    -- Check if shipping_quotes table exists
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'shipping_quotes'
    ) THEN
        RAISE EXCEPTION 'shipping_quotes table does not exist. Please run the quote system migrations first.';
    END IF;

    -- Verify required columns exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'shipping_quotes'
        AND column_name = 'customer_id'
    ) THEN
        RAISE EXCEPTION 'shipping_quotes.customer_id column is missing';
    END IF;

    RAISE NOTICE 'shipping_quotes table verified successfully';
END $$;

-- ============================================================================
-- PART 2: Ensure RLS is enabled on shipping_quotes
-- ============================================================================

ALTER TABLE IF EXISTS public.shipping_quotes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 3: Create or replace RLS policies for shipping_quotes
-- ============================================================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "shipping_quotes_select_policy" ON public.shipping_quotes;
DROP POLICY IF EXISTS "shipping_quotes_insert_policy" ON public.shipping_quotes;
DROP POLICY IF EXISTS "shipping_quotes_update_policy" ON public.shipping_quotes;
DROP POLICY IF EXISTS "shipping_quotes_delete_policy" ON public.shipping_quotes;

-- Helper function to check if user is admin (using JWT, no DB query)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN (
        auth.role() = 'service_role'
        OR
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Helper function to check if user is staff
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN (
        auth.role() = 'service_role'
        OR
        public.is_admin()
        OR
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff'
        OR
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'staff'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Policy 1: SELECT - Users see their own quotes, admins/staff see all
CREATE POLICY "shipping_quotes_select_policy" ON public.shipping_quotes
    FOR SELECT
    USING (
        auth.role() = 'service_role'
        OR
        -- User's own quotes by customer_id
        auth.uid()::text = customer_id
        OR
        -- Admins and staff can see all quotes (JWT-based, no DB query)
        public.is_admin()
        OR
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
        auth.uid()::text = customer_id
        OR
        public.is_admin()
        OR
        public.is_staff()
    )
    WITH CHECK (
        auth.role() = 'service_role'
        OR
        auth.uid()::text = customer_id
        OR
        public.is_admin()
        OR
        public.is_staff()
    );

-- Policy 4: DELETE - Only service role and admins can delete
CREATE POLICY "shipping_quotes_delete_policy" ON public.shipping_quotes
    FOR DELETE
    USING (
        auth.role() = 'service_role'
        OR
        public.is_admin()
    );

-- ============================================================================
-- PART 4: Grant necessary permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.shipping_quotes TO authenticated, anon;
GRANT DELETE ON public.shipping_quotes TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, anon;

-- ============================================================================
-- PART 5: Verify shipment_documents table exists (for ShipmentDetailsPage)
-- ============================================================================

DO $$
BEGIN
    -- Check if shipment_documents table exists
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'shipment_documents'
    ) THEN
        RAISE NOTICE 'shipment_documents table does not exist. Creating it...';
        
        CREATE TABLE IF NOT EXISTS public.shipment_documents (
            id SERIAL PRIMARY KEY,
            shipment_id INTEGER NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
            document_type TEXT NOT NULL,
            file_name TEXT NOT NULL,
            file_url TEXT NOT NULL,
            file_size BIGINT NOT NULL,
            mime_type TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            upload_date TIMESTAMPTZ DEFAULT NOW(),
            uploaded_by TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_shipment_documents_shipment_id 
            ON public.shipment_documents(shipment_id);

        ALTER TABLE public.shipment_documents ENABLE ROW LEVEL SECURITY;

        -- RLS Policy: Users can view documents for their shipments
        CREATE POLICY "shipment_documents_select_policy" ON public.shipment_documents
            FOR SELECT
            USING (
                auth.role() = 'service_role'
                OR
                EXISTS (
                    SELECT 1 FROM public.shipments s
                    WHERE s.id = shipment_documents.shipment_id
                    AND s.customer_id = auth.uid()::text
                )
                OR
                public.is_admin()
                OR
                public.is_staff()
            );

        -- RLS Policy: Users can upload documents for their shipments
        CREATE POLICY "shipment_documents_insert_policy" ON public.shipment_documents
            FOR INSERT
            WITH CHECK (
                auth.role() = 'service_role'
                OR
                EXISTS (
                    SELECT 1 FROM public.shipments s
                    WHERE s.id = shipment_documents.shipment_id
                    AND s.customer_id = auth.uid()::text
                )
                OR
                public.is_admin()
                OR
                public.is_staff()
            );

        GRANT SELECT, INSERT ON public.shipment_documents TO authenticated;
        GRANT ALL ON public.shipment_documents TO service_role;

        RAISE NOTICE 'shipment_documents table created successfully';
    ELSE
        RAISE NOTICE 'shipment_documents table already exists';
    END IF;
END $$;

-- ============================================================================
-- PART 6: Verification and logging
-- ============================================================================

DO $$
DECLARE
    quote_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Count quotes
    SELECT COUNT(*) INTO quote_count FROM public.shipping_quotes;
    RAISE NOTICE 'Total shipping_quotes in database: %', quote_count;

    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'shipping_quotes';
    RAISE NOTICE 'RLS policies on shipping_quotes: %', policy_count;

    IF policy_count < 4 THEN
        RAISE WARNING 'Expected at least 4 RLS policies on shipping_quotes, found %', policy_count;
    END IF;
END $$;

COMMENT ON TABLE public.shipping_quotes IS 'Stores shipping quotes generated from the shipping calculator. RLS policies allow users to view their own quotes and admins/staff to view all quotes.';
COMMENT ON TABLE public.shipment_documents IS 'Stores documents uploaded for shipments. Users can upload and view documents for their own shipments.';

