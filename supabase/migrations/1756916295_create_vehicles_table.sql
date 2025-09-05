-- Migration: create_vehicles_table
-- Created at: 1756916295

-- Create vehicles table for capacity management
CREATE TABLE vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    capacity_lbs INTEGER NOT NULL DEFAULT 1000,
    service_area JSONB, -- Store service area information
    active BOOLEAN DEFAULT true,
    base_location_zip TEXT,
    base_location_lat DECIMAL(10, 7),
    base_location_lng DECIMAL(10, 7),
    base_location_geom GEOMETRY(POINT, 4326),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_vehicles_active ON vehicles(active);
CREATE INDEX idx_vehicles_service_area ON vehicles USING GIN(service_area);
CREATE INDEX idx_vehicles_base_location ON vehicles USING GIST(base_location_geom);

-- Create function to update vehicle geometry from lat/lng
CREATE OR REPLACE FUNCTION update_vehicle_geom()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.base_location_lat IS NOT NULL AND NEW.base_location_lng IS NOT NULL THEN
        NEW.base_location_geom = ST_SetSRID(ST_MakePoint(NEW.base_location_lng, NEW.base_location_lat), 4326);
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for vehicle geometry updates
CREATE TRIGGER trigger_update_vehicle_geom
    BEFORE INSERT OR UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_vehicle_geom();;