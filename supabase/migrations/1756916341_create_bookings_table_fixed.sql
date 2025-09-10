-- Migration: create_bookings_table_fixed
-- Created at: 1756916341

-- Skip bookings table creation as it already exists from previous migration
-- This migration adds additional features to the existing bookings table

-- Create vehicle assignments table
CREATE TABLE vehicle_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID,
    notes TEXT,
    
    -- Ensure no double assignment of same booking to multiple vehicles
    UNIQUE(booking_id)
);

-- Note: Complex EXCLUDE constraint removed due to subquery limitations
-- Overlap prevention will be handled by application logic

-- Create indexes for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_window_start ON bookings(window_start);
CREATE INDEX IF NOT EXISTS idx_bookings_window_end ON bookings(window_end);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_pickup_or_drop ON bookings(pickup_or_drop);
CREATE INDEX IF NOT EXISTS idx_bookings_zip_code ON bookings(zip_code);
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_vehicle ON bookings(assigned_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_idempotency ON bookings(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_bookings_address_geom ON bookings USING GIST(address_geom);
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_booking ON vehicle_assignments(booking_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_vehicle ON vehicle_assignments(vehicle_id);

-- Create window range index for overlap queries
CREATE INDEX IF NOT EXISTS idx_bookings_window_range ON bookings USING GIST(tstzrange(window_start, window_end));

-- Create function to update booking geometry and distance
CREATE OR REPLACE FUNCTION update_booking_geom()
RETURNS TRIGGER AS $$
DECLARE
    base_geom GEOMETRY;
    calculated_distance DECIMAL;
BEGIN
    -- Update geometry from lat/lng if available
    IF NEW.address_lat IS NOT NULL AND NEW.address_lng IS NOT NULL THEN
        NEW.address_geom = ST_SetSRID(ST_MakePoint(NEW.address_lng, NEW.address_lat), 4326);
        
        -- Calculate distance from HQ (assuming HQ is at a default location)
        -- You can update this to use actual HQ coordinates
        base_geom = ST_SetSRID(ST_MakePoint(-74.756138, 40.337478), 4326); -- Example NJ coordinates
        NEW.distance_miles = ST_Distance(NEW.address_geom, base_geom) * 111139 / 1609.34; -- Convert to miles
        
    ELSIF NEW.zip_code IS NOT NULL THEN
        -- Try to get coordinates from postal_geos table
        SELECT geom INTO base_geom FROM postal_geos WHERE zip_code = NEW.zip_code LIMIT 1;
        IF base_geom IS NOT NULL THEN
            NEW.address_geom = base_geom;
            base_geom = ST_SetSRID(ST_MakePoint(-74.756138, 40.337478), 4326); -- HQ location
            NEW.distance_miles = ST_Distance(NEW.address_geom, base_geom) * 111139 / 1609.34;
        END IF;
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking updates (drop if exists first)
DROP TRIGGER IF EXISTS trigger_update_booking_geom ON bookings;
CREATE TRIGGER trigger_update_booking_geom
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_booking_geom();
