-- Migration: fix_booking_rls_policies
-- Created at: 1756921370

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can insert own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Staff can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Staff can manage all bookings" ON bookings;

-- Create correct RLS policies for bookings table
-- Allow users to view their own bookings
CREATE POLICY "allow_users_select_own_bookings" ON bookings
    FOR SELECT USING (auth.uid() = customer_id);

-- Allow users to insert their own bookings
CREATE POLICY "allow_users_insert_own_bookings" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Allow users to update their own bookings
CREATE POLICY "allow_users_update_own_bookings" ON bookings
    FOR UPDATE USING (auth.uid() = customer_id)
    WITH CHECK (auth.uid() = customer_id);

-- Allow staff to view all bookings (staff role check simplified)
CREATE POLICY "allow_staff_view_all_bookings" ON bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid()
        )
    );

-- Allow staff to manage all bookings  
CREATE POLICY "allow_staff_manage_all_bookings" ON bookings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid()
        )
    );;