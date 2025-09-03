-- Migration: enhance_shipments_table
-- Created at: 1756874390

-- Add missing columns to existing shipments table
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS origin_address TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS total_weight DECIMAL(8,2);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS total_declared_value DECIMAL(10,2);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS estimated_delivery_date TIMESTAMPTZ;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS actual_delivery_date TIMESTAMPTZ;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS special_instructions TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS assigned_staff_id UUID;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';;