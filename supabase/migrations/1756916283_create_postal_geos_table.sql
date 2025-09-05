-- Migration: create_postal_geos_table
-- Created at: 1756916283

-- Create postal_geos table for ZIP code geographic data
CREATE TABLE postal_geos (
    id SERIAL PRIMARY KEY,
    zip_code TEXT NOT NULL UNIQUE,
    city TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'NJ',
    county TEXT,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    geom GEOMETRY(POINT, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index for efficient distance queries
CREATE INDEX idx_postal_geos_geom ON postal_geos USING GIST(geom);
CREATE INDEX idx_postal_geos_zip ON postal_geos(zip_code);

-- Create function to update geometry from lat/lng
CREATE OR REPLACE FUNCTION update_postal_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update geometry
CREATE TRIGGER trigger_update_postal_geom
    BEFORE INSERT OR UPDATE ON postal_geos
    FOR EACH ROW
    EXECUTE FUNCTION update_postal_geom();;