-- Migration: simplify_booking_rls_policies
-- Created at: 1756921383

-- Drop the complex policies and create simpler ones
DROP POLICY IF EXISTS "allow_staff_view_all_bookings" ON bookings;
DROP POLICY IF EXISTS "allow_staff_manage_all_bookings" ON bookings;

-- Simplified policy: authenticated users can view their own bookings
CREATE POLICY "authenticated_users_own_bookings" ON bookings
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND 
        auth.uid() = customer_id
    );

-- Allow authenticated users to insert bookings where they are the customer
CREATE POLICY "authenticated_users_insert_bookings" ON bookings
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        auth.uid() = customer_id
    );

-- Allow authenticated users to update their own bookings
CREATE POLICY "authenticated_users_update_bookings" ON bookings
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND 
        auth.uid() = customer_id
    ) WITH CHECK (
        auth.uid() IS NOT NULL AND 
        auth.uid() = customer_id
    );;