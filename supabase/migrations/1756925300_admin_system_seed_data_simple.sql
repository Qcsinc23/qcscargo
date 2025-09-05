-- Migration: admin_system_seed_data_simple
-- Created at: 1756925300
-- Purpose: Seed admin configuration and templates without user references

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
    updated_by uuid,
    updated_at timestamptz DEFAULT now()
);

-- Seed dashboard configuration
INSERT INTO admin_dashboard_config (config_key, config_value, description) VALUES
('dashboard_widgets', '{"enabled": ["revenue_chart", "booking_status", "vehicle_utilization", "recent_activity", "customer_insights"], "refresh_interval": 300}', 'Configuration for dashboard widgets and refresh settings'),
('notification_settings', '{"email_enabled": true, "sms_enabled": false, "auto_notifications": {"booking_confirmed": true, "booking_rescheduled": true, "service_completed": true, "reminder_24h": true}}', 'Notification system configuration'),
('business_rules', '{"max_booking_advance_days": 30, "min_booking_notice_hours": 2, "auto_confirm_threshold_lbs": 500, "express_surcharge_percentage": 25, "peak_hours": ["09:00", "17:00"]}', 'Core business logic configuration'),
('report_settings', '{"cache_duration_hours": 1, "export_formats": ["json", "csv"], "auto_archive_days": 90}', 'Reporting and analytics configuration'),
('admin_theme', '{"primary_color": "#2563eb", "sidebar_collapsed": false, "table_page_size": 25, "chart_animations": true}', 'Admin dashboard UI preferences')
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
        WHEN CAST(estimated_weight AS NUMERIC) > 1000 THEN 'urgent'
        ELSE 'standard'
    END,
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
            SELECT COALESCE(SUM(CAST(total_amount AS NUMERIC)), 0) FROM bookings 
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
                    ROUND((SUM(CAST(estimated_weight AS NUMERIC)) / MAX(v2.capacity_lbs) * 100)::numeric, 1) as rate
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
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats(text) TO authenticated;