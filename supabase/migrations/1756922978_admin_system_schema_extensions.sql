-- Migration: admin_system_schema_extensions
-- Created at: 1756922978

-- Migration: admin_system_schema_extensions
-- Created at: 1756925000
-- Purpose: Add admin tables and enhance existing schema for complete logistics management

-- Extend existing bookings table with admin fields
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS assigned_vehicle_id uuid REFERENCES vehicles(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS priority_level text DEFAULT 'standard' CHECK (priority_level IN ('standard', 'express', 'urgent'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS internal_notes text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS admin_flags jsonb DEFAULT '{}'::jsonb; -- For flexible admin metadata

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_bookings_updated_at();

-- Staff/Admin profiles table
CREATE TABLE IF NOT EXISTS staff_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('admin', 'staff', 'driver', 'customer_service')),
    full_name text NOT NULL,
    phone text,
    email text,
    department text,
    hire_date date DEFAULT CURRENT_DATE,
    active boolean DEFAULT true,
    permissions jsonb DEFAULT '{}'::jsonb, -- Flexible permissions system
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Communication and notifications log
CREATE TABLE IF NOT EXISTS notifications_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id uuid REFERENCES auth.users(id),
    staff_id uuid REFERENCES auth.users(id),
    notification_type text NOT NULL CHECK (notification_type IN ('email', 'sms', 'system', 'call')),
    channel text, -- email address, phone number, etc.
    subject text,
    message text NOT NULL,
    template_used text,
    sent_at timestamptz DEFAULT now(),
    delivery_status text DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    read_at timestamptz,
    response_received text,
    metadata jsonb DEFAULT '{}'::jsonb
);

-- Admin overrides and exceptions
CREATE TABLE IF NOT EXISTS admin_overrides (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    override_type text NOT NULL CHECK (override_type IN ('blackout', 'capacity_block', 'manual_assignment', 'price_override', 'service_exception')),
    title text NOT NULL,
    description text,
    date_start timestamptz,
    date_end timestamptz,
    affected_vehicles uuid[] DEFAULT '{}', -- Array of vehicle IDs
    affected_areas text[], -- Array of ZIP codes or regions
    override_data jsonb DEFAULT '{}'::jsonb, -- Flexible data for different override types
    reason text NOT NULL,
    created_by uuid NOT NULL REFERENCES auth.users(id),
    approved_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    active boolean DEFAULT true
);

-- Analytics and reporting cache
CREATE TABLE IF NOT EXISTS analytics_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key text UNIQUE NOT NULL,
    report_type text NOT NULL,
    date_range tstzrange,
    filters jsonb DEFAULT '{}'::jsonb,
    data jsonb NOT NULL,
    generated_by uuid REFERENCES auth.users(id),
    generated_at timestamptz DEFAULT now(),
    expires_at timestamptz DEFAULT (now() + interval '1 hour')
);

-- Customer insights and behavioral data
CREATE TABLE IF NOT EXISTS customer_insights (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    total_bookings integer DEFAULT 0,
    total_revenue decimal(10,2) DEFAULT 0,
    average_booking_value decimal(10,2) DEFAULT 0,
    preferred_service_type text,
    preferred_time_slots text[], -- Array of preferred time ranges
    frequent_destinations text[], -- Array of common ZIP codes
    booking_frequency text CHECK (booking_frequency IN ('daily', 'weekly', 'monthly', 'occasional', 'one_time')),
    customer_tier text DEFAULT 'standard' CHECK (customer_tier IN ('vip', 'premium', 'standard', 'new')),
    risk_score integer DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    satisfaction_rating decimal(3,2), -- Average rating out of 5.00
    last_booking_date timestamptz,
    notes text,
    tags text[] DEFAULT '{}', -- Flexible tagging system
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Activity audit log for all admin actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id uuid NOT NULL REFERENCES auth.users(id),
    action_type text NOT NULL,
    table_name text,
    record_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    timestamp timestamptz DEFAULT now(),
    session_id text
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_created_by ON bookings(created_by);
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_to ON bookings(assigned_to);
CREATE INDEX IF NOT EXISTS idx_bookings_updated_at ON bookings(updated_at);
CREATE INDEX IF NOT EXISTS idx_bookings_priority ON bookings(priority_level);
CREATE INDEX IF NOT EXISTS idx_bookings_admin_flags ON bookings USING GIN(admin_flags);

CREATE INDEX IF NOT EXISTS idx_staff_profiles_role ON staff_profiles(role);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_active ON staff_profiles(active);

CREATE INDEX IF NOT EXISTS idx_notifications_booking ON notifications_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_customer ON notifications_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications_log(delivery_status);

CREATE INDEX IF NOT EXISTS idx_admin_overrides_type ON admin_overrides(override_type);
CREATE INDEX IF NOT EXISTS idx_admin_overrides_active ON admin_overrides(active);
CREATE INDEX IF NOT EXISTS idx_admin_overrides_dates ON admin_overrides(date_start, date_end);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_analytics_expires ON analytics_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_customer_insights_tier ON customer_insights(customer_tier);
CREATE INDEX IF NOT EXISTS idx_customer_insights_frequency ON customer_insights(booking_frequency);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON admin_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON admin_audit_log(action_type);

-- Create functions for customer insights updates
CREATE OR REPLACE FUNCTION update_customer_insights()
RETURNS TRIGGER AS $$
BEGIN
    -- Update customer insights when booking is created or updated
    INSERT INTO customer_insights (customer_id, total_bookings, last_booking_date)
    VALUES (NEW.customer_id, 1, NEW.created_at)
    ON CONFLICT (customer_id) DO UPDATE SET
        total_bookings = customer_insights.total_bookings + 1,
        last_booking_date = GREATEST(customer_insights.last_booking_date, NEW.created_at),
        updated_at = now();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_insights
    AFTER INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_insights();

-- Function to clean up expired analytics cache
CREATE OR REPLACE FUNCTION cleanup_expired_analytics_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM analytics_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;;