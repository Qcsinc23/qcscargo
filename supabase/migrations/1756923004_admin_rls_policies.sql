-- Migration: admin_rls_policies
-- Created at: 1756923004

-- Migration: admin_rls_policies
-- Created at: 1756925100
-- Purpose: Set up Row Level Security policies for admin system

-- Enable RLS on all new admin tables
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin or staff
CREATE OR REPLACE FUNCTION is_admin_or_staff()
RETURNS boolean AS $$
DECLARE
    user_role text;
BEGIN
    -- Check if user has admin or staff role in JWT claims
    user_role := (auth.jwt() ->> 'user_role');
    RETURN user_role IN ('admin', 'staff', 'driver', 'customer_service');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check specific role
CREATE OR REPLACE FUNCTION has_role(required_role text)
RETURNS boolean AS $$
BEGIN
    RETURN (auth.jwt() ->> 'user_role') = required_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced bookings policies for admin access
-- Drop existing policies and recreate with admin access
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update their own pending bookings" ON bookings;

-- Admin users can see all bookings
CREATE POLICY "Admin full access to bookings" ON bookings
    FOR ALL USING (is_admin_or_staff());

-- Customers can only see their own bookings
CREATE POLICY "Customers can view own bookings" ON bookings
    FOR SELECT USING (auth.uid() = customer_id AND NOT is_admin_or_staff());

-- Customers can create bookings
CREATE POLICY "Customers can create bookings" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = customer_id AND NOT is_admin_or_staff());

-- Customers can update their own pending bookings
CREATE POLICY "Customers can update own pending bookings" ON bookings
    FOR UPDATE USING (
        auth.uid() = customer_id 
        AND status IN ('pending', 'confirmed') 
        AND NOT is_admin_or_staff()
    )
    WITH CHECK (
        auth.uid() = customer_id 
        AND status IN ('pending', 'confirmed')
        AND NOT is_admin_or_staff()
    );

-- Staff profiles policies
CREATE POLICY "Admin can manage all staff profiles" ON staff_profiles
    FOR ALL USING (has_role('admin'));

CREATE POLICY "Staff can view all staff profiles" ON staff_profiles
    FOR SELECT USING (is_admin_or_staff());

CREATE POLICY "Staff can view own profile" ON staff_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Staff can update own profile" ON staff_profiles
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Notifications log policies
CREATE POLICY "Admin and staff can manage notifications" ON notifications_log
    FOR ALL USING (is_admin_or_staff());

CREATE POLICY "Customers can view their notifications" ON notifications_log
    FOR SELECT USING (auth.uid() = customer_id AND NOT is_admin_or_staff());

-- Admin overrides policies
CREATE POLICY "Admin can manage overrides" ON admin_overrides
    FOR ALL USING (has_role('admin'));

CREATE POLICY "Staff can view overrides" ON admin_overrides
    FOR SELECT USING (is_admin_or_staff());

-- Analytics cache policies
CREATE POLICY "Admin and staff can access analytics" ON analytics_cache
    FOR ALL USING (is_admin_or_staff());

-- Customer insights policies
CREATE POLICY "Admin and staff can view all customer insights" ON customer_insights
    FOR SELECT USING (is_admin_or_staff());

CREATE POLICY "Admin can manage customer insights" ON customer_insights
    FOR ALL USING (has_role('admin'));

CREATE POLICY "Staff can update customer insights" ON customer_insights
    FOR UPDATE USING (is_admin_or_staff());

-- Audit log policies
CREATE POLICY "Admin can view all audit logs" ON admin_audit_log
    FOR SELECT USING (has_role('admin'));

CREATE POLICY "Staff can view own audit logs" ON admin_audit_log
    FOR SELECT USING (auth.uid() = admin_user_id);

CREATE POLICY "Admin and staff can create audit logs" ON admin_audit_log
    FOR INSERT WITH CHECK (is_admin_or_staff());

-- Enhanced vehicle policies for admin access
DROP POLICY IF EXISTS "Anyone can view vehicles" ON vehicles;

CREATE POLICY "Public can view basic vehicle info" ON vehicles
    FOR SELECT USING (NOT is_admin_or_staff());

CREATE POLICY "Admin and staff can manage vehicles" ON vehicles
    FOR ALL USING (is_admin_or_staff());

-- Enhanced vehicle assignments policies
DROP POLICY IF EXISTS "Anyone can view vehicle assignments" ON vehicle_assignments;

CREATE POLICY "Admin and staff can manage assignments" ON vehicle_assignments
    FOR ALL USING (is_admin_or_staff());

CREATE POLICY "Customers can view their assignments" ON vehicle_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings b 
            WHERE b.id = booking_id 
            AND b.customer_id = auth.uid()
        )
    );

-- User profiles policies for admin access
CREATE POLICY "Admin can view all user profiles" ON user_profiles
    FOR SELECT USING (has_role('admin'));

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
    action_type_param text,
    table_name_param text DEFAULT NULL,
    record_id_param uuid DEFAULT NULL,
    old_values_param jsonb DEFAULT NULL,
    new_values_param jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    log_id uuid;
BEGIN
    INSERT INTO admin_audit_log (
        admin_user_id,
        action_type,
        table_name,
        record_id,
        old_values,
        new_values,
        session_id
    ) VALUES (
        auth.uid(),
        action_type_param,
        table_name_param,
        record_id_param,
        old_values_param,
        new_values_param,
        (auth.jwt() ->> 'session_id')
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on helper functions
GRANT EXECUTE ON FUNCTION is_admin_or_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION has_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_action(text, text, uuid, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_analytics_cache() TO authenticated;;