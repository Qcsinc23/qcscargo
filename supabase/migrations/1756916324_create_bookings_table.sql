-- Migration: create_bookings_table
-- Created at: 1756916324

-- Create bookings table with overlap prevention
CREATE TABLE bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL,
    quote_id INTEGER REFERENCES quotes(id),
    shipment_id INTEGER REFERENCES shipments(id),
    pickup_or_drop TEXT NOT NULL CHECK (pickup_or_drop IN ('pickup', 'dropoff')),
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    address JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    notes TEXT,
    service_type TEXT DEFAULT 'standard' CHECK (service_type IN ('standard', 'express')),
    estimated_weight DECIMAL(8,2),
    zip_code TEXT,
    address_lat DECIMAL(10, 7),
    address_lng DECIMAL(10, 7),
    address_geom GEOMETRY(POINT, 4326),
    distance_miles DECIMAL(6,2),
    assigned_vehicle_id UUID REFERENCES vehicles(id),
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint to ensure window_end > window_start
    CONSTRAINT check_booking_window CHECK (window_end > window_start),
    
    -- Constraint to prevent double booking same customer in overlapping windows
    CONSTRAINT unique_customer_window EXCLUDE USING GIST (
        customer_id WITH =,
        tstzrange(window_start, window_end) WITH &&
    ) WHERE (status IN ('pending', 'confirmed'))
);

-- Create indexes for performance
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_window_start ON bookings(window_start);
CREATE INDEX idx_bookings_window_end ON bookings(window_end);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_pickup_or_drop ON bookings(pickup_or_drop);
CREATE INDEX idx_bookings_zip_code ON bookings(zip_code);
CREATE INDEX idx_bookings_assigned_vehicle ON bookings(assigned_vehicle_id);
CREATE INDEX idx_bookings_idempotency ON bookings(idempotency_key);
CREATE INDEX idx_bookings_address_geom ON bookings USING GIST(address_geom);

-- Create window range index for overlap queries
CREATE INDEX idx_bookings_window_range ON bookings USING GIST(tstzrange(window_start, window_end));

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

-- Create trigger for booking updates
CREATE TRIGGER trigger_update_booking_geom
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_booking_geom();;