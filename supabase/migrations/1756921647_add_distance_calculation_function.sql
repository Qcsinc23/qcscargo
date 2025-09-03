-- Migration: add_distance_calculation_function
-- Created at: 1756921647

-- Migration: add_distance_calculation_function
-- Created at: 1756916500

-- Create PostGIS distance calculation function
CREATE OR REPLACE FUNCTION execute_distance_query(query_zip TEXT)
RETURNS TABLE(
    zip_code TEXT,
    city TEXT,
    state TEXT,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    distance_miles NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pg.zip_code,
        pg.city,
        pg.state,
        pg.latitude,
        pg.longitude,
        ROUND(
            ST_Distance(
                pg.geom,
                get_hq_location()
            ) * 69 -- Convert from degrees to miles (approximate)
        )::numeric AS distance_miles
    FROM postal_geos pg 
    WHERE pg.zip_code = query_zip
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users and anon
GRANT EXECUTE ON FUNCTION execute_distance_query(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_distance_query(TEXT) TO anon;;