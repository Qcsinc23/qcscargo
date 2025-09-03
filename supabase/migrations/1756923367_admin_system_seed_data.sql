-- Migration: admin_system_seed_data
-- Created at: 1756923367

-- Migration: admin_system_seed_data
-- Created at: 1756925200
-- Purpose: Seed initial admin data and sample staff profiles

-- Create sample staff profiles (these would be created when real staff users register)
INSERT INTO staff_profiles (user_id, role, full_name, phone, email, department, active, permissions) VALUES
-- Note: In production, these would reference actual auth.users entries
('11111111-1111-1111-1111-111111111111', 'admin', 'Admin User', '555-0101', 'admin@qcscargo.com', 'Operations', true, '{"all_permissions": true}'),
('22222222-2222-2222-2222-222222222222', 'staff', 'Operations Staff', '555-0102', 'staff@qcscargo.com', 'Operations', true, '{"manage_bookings": true, "view_reports": true}'),
('33333333-3333-3333-3333-333333333333', 'driver', 'Driver One', '555-0103', 'driver1@qcscargo.com', 'Fleet', true, '{"view_assignments": true, "update_status": true}'),
('44444444-4444-4444-4444-444444444444', 'customer_service', 'CS Representative', '555-0104', 'cs@qcscargo.com', 'Customer Service', true, '{"manage_customer_communications": true, "view_bookings": true}')
ON CONFLICT (user_id) DO NOTHING;

-- Create sample admin overrides for holidays and special dates
INSERT INTO admin_overrides (override_type, title, description, date_start, date_end, reason, created_by, active) VALUES
('blackout', 'Christmas Day 2024', 'No service available on Christmas Day', '2024-12-25 00:00:00+00', '2024-12-25 23:59:59+00', 'Federal Holiday - Office Closed', '11111111-1111-1111-1111-111111111111', true),
('blackout', 'New Years Day 2025', 'No service available on New Years Day', '2025-01-01 00:00:00+00', '2025-01-01 23:59:59+00', 'Federal Holiday - Office Closed', '11111111-1111-1111-1111-111111111111', true),
('capacity_block', 'Fleet Maintenance Window', 'Reduced capacity during maintenance', '2025-09-15 08:00:00+00', '2025-09-15 16:00:00+00', 'Scheduled vehicle maintenance', '11111111-1111-1111-1111-111111111111', true),
('service_exception', 'Hurricane Preparedness', 'Special service adjustments for severe weather', '2025-08-01 00:00:00+00', '2025-09-30 23:59:59+00', 'Hurricane season precautions', '11111111-1111-1111-1111-111111111111', true)
ON CONFLICT (id) DO NOTHING;

-- Seed some sample customer insights data (this would normally be generated automatically)
INSERT INTO customer_insights (customer_id, total_bookings, total_revenue, average_booking_value, preferred_service_type, customer_tier, booking_frequency, satisfaction_rating) VALUES
-- Note: These would reference actual customer user IDs
('55555555-5555-5555-5555-555555555555', 12, 2400.00, 200.00, 'express', 'premium', 'monthly', 4.5),
('66666666-6666-6666-6666-666666666666', 25, 3750.00, 150.00, 'standard', 'vip', 'weekly', 4.8),
('77777777-7777-7777-7777-777777777777', 3, 450.00, 150.00, 'standard', 'standard', 'occasional', 4.2),
('88888888-8888-8888-8888-888888888888', 1, 125.00, 125.00, 'standard', 'new', 'one_time', 4.0)
ON CONFLICT (customer_id) DO NOTHING;

-- Create notification templates for common scenarios
CREATE TABLE IF NOT EXISTS notification_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name text UNIQUE NOT NULL,
    subject text NOT NULL,
    message_template text NOT NULL,
    notification_type text NOT NULL CHECK (notification_type IN ('email', 'sms', 'system')),
    variables text[], -- Array of variable names that can be substituted
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Seed notification templates
INSERT INTO notification_templates (template_name, subject, message_template, notification_type, variables) VALUES
('booking_confirmed', 'Booking Confirmed - QCS Cargo', 'Hello {{customer_name}},\n\nYour booking has been confirmed for {{booking_date}} between {{time_window}}.\n\nBooking Details:\n- Service: {{service_type}}\n- Address: {{pickup_address}}\n- Estimated Weight: {{weight}} lbs\n- Total Cost: ${{total_cost}}\n\nOur team will contact you 30 minutes before arrival.\n\nThank you for choosing QCS Cargo!', 'email', '{"customer_name", "booking_date", "time_window", "service_type", "pickup_address", "weight", "total_cost"}'),
('booking_rescheduled', 'Booking Rescheduled - QCS Cargo', 'Hello {{customer_name}},\n\nYour booking has been rescheduled to {{new_date}} between {{new_time_window}}.\n\nReason: {{reschedule_reason}}\n\nWe apologize for any inconvenience. If you have questions, please contact us.\n\nBest regards,\nQCS Cargo Team', 'email', '{"customer_name", "new_date", "new_time_window", "reschedule_reason"}'),
('booking_cancelled', 'Booking Cancelled - QCS Cargo', 'Hello {{customer_name}},\n\nYour booking for {{original_date}} has been cancelled.\n\nReason: {{cancellation_reason}}\n\nIf you did not request this cancellation, please contact us immediately.\n\nBest regards,\nQCS Cargo Team', 'email', '{"customer_name", "original_date", "cancellation_reason"}'),
('service_completed', 'Service Completed - QCS Cargo', 'Hello {{customer_name}},\n\nYour service has been completed successfully!\n\nService Details:\n- Date: {{service_date}}\n- Time: {{completion_time}}\n- Weight Processed: {{actual_weight}} lbs\n\nThank you for choosing QCS Cargo. We appreciate your business!\n\nPlease rate your experience: {{rating_link}}', 'email', '{"customer_name", "service_date", "completion_time", "actual_weight", "rating_link"}'),
('reminder_24h', 'Service Reminder - QCS Cargo', 'Hello {{customer_name}},\n\nThis is a reminder that your {{service_type}} service is scheduled for tomorrow, {{service_date}} between {{time_window}}.\n\nPlease ensure all items are ready for pickup at {{pickup_address}}.\n\nFor any changes, contact us at least 2 hours in advance.\n\nThank you!', 'sms', '{"customer_name", "service_type", "service_date", "time_window", "pickup_address"}')
ON CONFLICT (template_name) DO NOTHING;

-- Create admin dashboard configuration table
CREATE TABLE IF NOT EXISTS admin_dashboard_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key text UNIQUE NOT NULL,
    config_value jsonb NOT NULL,
    description text,
    updated_by uuid REFERENCES auth.users(id),
    updated_at timestamptz DEFAULT now()
);

-- Seed dashboard configuration
INSERT INTO admin_dashboard_config (config_key, config_value, description) VALUES
('dashboard_widgets', '{"enabled": ["revenue_chart", "booking_status", "vehicle_utilization", "recent_activity", "customer_insights"], "refresh_interval": 300}', 'Configuration for dashboard widgets and refresh settings'),
('notification_settings', '{"email_enabled": true, "sms_enabled": false, "auto_notifications": {"booking_confirmed": true, "booking_rescheduled": true, "service_completed": true, "reminder_24h": true}}', 'Notification system configuration'),
('business_rules', '{"max_booking_advance_days": 30, "min_booking_notice_hours": 2, "auto_confirm_threshold_lbs": 500, "express_surcharge_percentage": 25, "peak_hours": ["09:00", "17:00"]}', 'Core business logic configuration'),
('report_settings', '{"cache_duration_hours": 1, "export_formats": ["json", "csv"], "auto_archive_days": 90}', 'Reporting and analytics configuration')
ON CONFLICT (config_key) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_dashboard_config ENABLE ROW LEVEL SECURITY;

-- Create policies for new tables
CREATE POLICY "Admin and staff can manage notification templates" ON notification_templates
    FOR ALL USING (is_admin_or_staff());

CREATE POLICY "Admin can manage dashboard config" ON admin_dashboard_config
    FOR ALL USING (has_role('admin'));

CREATE POLICY "Staff can view dashboard config" ON admin_dashboard_config
    FOR SELECT USING (is_admin_or_staff());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(active);
CREATE INDEX IF NOT EXISTS idx_admin_dashboard_config_key ON admin_dashboard_config(config_key);

-- Grant permissions
GRANT ALL ON notification_templates TO authenticated;
GRANT ALL ON admin_dashboard_config TO authenticated;

-- Update existing bookings with some admin fields (for demo purposes)
UPDATE bookings 
SET 
    priority_level = CASE 
        WHEN service_type = 'express' THEN 'express'
        WHEN estimated_weight > 1000 THEN 'urgent'
        ELSE 'standard'
    END,
    created_by = COALESCE(customer_id, '55555555-5555-5555-5555-555555555555'),
    updated_at = NOW()
WHERE priority_level IS NULL;

-- Create function to get admin dashboard stats
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats(date_filter text DEFAULT '7 days')
RETURNS jsonb AS $$
DECLARE
    stats jsonb;
    date_threshold timestamptz;
BEGIN
    -- Calculate date threshold
    date_threshold := NOW() - (date_filter || ' ago')::interval;
    
    -- Build comprehensive stats
    SELECT jsonb_build_object(
        'total_bookings', (
            SELECT COUNT(*) FROM bookings WHERE created_at >= date_threshold
        ),
        'total_revenue', (
            SELECT COALESCE(SUM(total_amount::numeric), 0) FROM bookings 
            WHERE created_at >= date_threshold AND status IN ('completed', 'confirmed')
        ),
        'status_distribution', (
            SELECT jsonb_object_agg(status, count) 
            FROM (SELECT status, COUNT(*) as count FROM bookings WHERE created_at >= date_threshold GROUP BY status) s
        ),
        'vehicle_utilization', (
            SELECT jsonb_object_agg(v.name, COALESCE(utilization.rate, 0))
            FROM vehicles v
            LEFT JOIN (
                SELECT 
                    assigned_vehicle_id,
                    ROUND((SUM(estimated_weight::numeric) / MAX(v2.capacity_lbs) * 100)::numeric, 1) as rate
                FROM bookings b
                JOIN vehicles v2 ON v2.id = b.assigned_vehicle_id
                WHERE b.created_at >= date_threshold AND b.status IN ('confirmed', 'completed')
                GROUP BY assigned_vehicle_id
            ) utilization ON utilization.assigned_vehicle_id = v.id
        ),
        'top_destinations', (
            SELECT jsonb_agg(jsonb_build_object('zip', zip_code, 'count', booking_count))
            FROM (
                SELECT 
                    address->>'zip_code' as zip_code, 
                    COUNT(*) as booking_count
                FROM bookings 
                WHERE created_at >= date_threshold
                GROUP BY address->>'zip_code'
                ORDER BY COUNT(*) DESC
                LIMIT 10
            ) top_zips
        ),
        'generated_at', NOW()
    ) INTO stats;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats(text) TO authenticated;;