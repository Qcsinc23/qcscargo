-- Fix facilities RLS policies to allow virtual address retrieval
-- Created at: 1758020000
-- Purpose: Enable facilities table access for virtual address function

-- Ensure facilities table has RLS enabled with proper policies
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read facility data
-- Facility information is not sensitive and needed for virtual addresses
DROP POLICY IF EXISTS facilities_read_all ON public.facilities;
CREATE POLICY facilities_read_all
ON public.facilities
FOR SELECT
TO authenticated
USING (true);

-- Allow service role full access for admin operations
DROP POLICY IF EXISTS facilities_service_role_all ON public.facilities;
CREATE POLICY facilities_service_role_all
ON public.facilities
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT ON public.facilities TO authenticated;
GRANT ALL ON public.facilities TO service_role;