-- Migration: create_bookings_system_tables
-- Created at: 1756916367

-- Create bookings table
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
    CONSTRAINT check_booking_window CHECK (window_end > window_start)
);

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

-- Create availability overrides table for holidays/blackouts
CREATE TABLE availability_overrides (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    open_time TIME,
    close_time TIME,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(date)
);

-- Create capacity blocks table for special capacity restrictions
CREATE TABLE capacity_blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    max_lbs INTEGER NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_capacity_window CHECK (window_end > window_start)
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
CREATE INDEX idx_vehicle_assignments_booking ON vehicle_assignments(booking_id);
CREATE INDEX idx_vehicle_assignments_vehicle ON vehicle_assignments(vehicle_id);
CREATE INDEX idx_availability_overrides_date ON availability_overrides(date);
CREATE INDEX idx_capacity_blocks_window ON capacity_blocks USING GIST(tstzrange(window_start, window_end));

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
    EXECUTE FUNCTION update_booking_geom();

-- Create function to check for booking conflicts before insert/update
CREATE OR REPLACE FUNCTION check_booking_conflicts()
RETURNS TRIGGER AS $$
DECLARE
    conflict_count INTEGER;
    vehicle_capacity INTEGER;
    total_weight DECIMAL;
BEGIN
    -- Skip checks for cancelled bookings
    IF NEW.status = 'cancelled' THEN
        RETURN NEW;
    END IF;

    -- Check for customer double-booking in overlapping windows
    SELECT COUNT(*) INTO conflict_count
    FROM bookings 
    WHERE customer_id = NEW.customer_id 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND status IN ('pending', 'confirmed')
      AND tstzrange(window_start, window_end) && tstzrange(NEW.window_start, NEW.window_end);
      
    IF conflict_count > 0 THEN
        RAISE EXCEPTION 'Customer already has a booking in this time window';
    END IF;

    -- Check vehicle capacity if assigned
    IF NEW.assigned_vehicle_id IS NOT NULL THEN
        SELECT capacity_lbs INTO vehicle_capacity 
        FROM vehicles 
        WHERE id = NEW.assigned_vehicle_id AND active = true;
        
        IF vehicle_capacity IS NULL THEN
            RAISE EXCEPTION 'Vehicle not found or inactive';
        END IF;
        
        -- Check total weight for overlapping bookings on same vehicle
        SELECT COALESCE(SUM(estimated_weight), 0) INTO total_weight
        FROM bookings b
        JOIN vehicle_assignments va ON b.id = va.booking_id
        WHERE va.vehicle_id = NEW.assigned_vehicle_id
          AND b.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
          AND b.status IN ('pending', 'confirmed')
          AND tstzrange(b.window_start, b.window_end) && tstzrange(NEW.window_start, NEW.window_end);
          
        IF (total_weight + COALESCE(NEW.estimated_weight, 0)) > vehicle_capacity THEN
            RAISE EXCEPTION 'Vehicle capacity exceeded for this time window';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for conflict checking
CREATE TRIGGER trigger_check_booking_conflicts
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION check_booking_conflicts();;