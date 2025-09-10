-- Migration: seed_booking_system_data
-- Created at: 1756916435

-- Seed postal_geos table with sample NJ ZIP codes
INSERT INTO postal_geos (zip_code, city, state, county, latitude, longitude) VALUES
('07001', 'Avenel', 'NJ', 'Middlesex', 40.5787, -74.2854),
('07002', 'Bayonne', 'NJ', 'Hudson', 40.6687, -74.1143),
('07003', 'Bloomfield', 'NJ', 'Essex', 40.8068, -74.1854),
('07004', 'Fairfield', 'NJ', 'Essex', 40.8837, -74.3021),
('07005', 'Boonton', 'NJ', 'Morris', 40.9026, -74.4071),
('07006', 'Caldwell', 'NJ', 'Essex', 40.8398, -74.2765),
('07007', 'Carteret', 'NJ', 'Middlesex', 40.5771, -74.2287),
('07008', 'Carteret', 'NJ', 'Middlesex', 40.5771, -74.2287),
('07009', 'Cedar Grove', 'NJ', 'Essex', 40.8534, -74.2282),
('07010', 'Cliffside Park', 'NJ', 'Bergen', 40.8218, -73.9876),
('07011', 'Clifton', 'NJ', 'Passaic', 40.8584, -74.1638),
('07012', 'Clifton', 'NJ', 'Passaic', 40.8584, -74.1638),
('07013', 'Clifton', 'NJ', 'Passaic', 40.8584, -74.1638),
('07014', 'Clifton', 'NJ', 'Passaic', 40.8584, -74.1638),
('07015', 'Clifton', 'NJ', 'Passaic', 40.8584, -74.1638),
('07016', 'Cranford', 'NJ', 'Union', 40.6584, -74.2993),
('07017', 'East Orange', 'NJ', 'Essex', 40.7673, -74.2049),
('07018', 'East Orange', 'NJ', 'Essex', 40.7673, -74.2049),
('07019', 'East Orange', 'NJ', 'Essex', 40.7673, -74.2049),
('07020', 'Edgewater', 'NJ', 'Bergen', 40.8268, -73.9732),
('07021', 'Essex Fells', 'NJ', 'Essex', 40.8240, -74.2843),
('07022', 'Fairview', 'NJ', 'Bergen', 40.8118, -74.0007),
('07023', 'Fanwood', 'NJ', 'Union', 40.6407, -74.3826),
('07024', 'Fort Lee', 'NJ', 'Bergen', 40.8501, -73.9701),
('07025', 'Fort Lee', 'NJ', 'Bergen', 40.8501, -73.9701),
('07026', 'Garfield', 'NJ', 'Bergen', 40.8815, -74.1132),
('07027', 'Garwood', 'NJ', 'Union', 40.6518, -74.3265),
('07028', 'Glen Ridge', 'NJ', 'Essex', 40.8051, -74.2037),
('07029', 'Harrison', 'NJ', 'Hudson', 40.7465, -74.1565),
('07030', 'Hoboken', 'NJ', 'Hudson', 40.7439, -74.0324),
('07031', 'North Arlington', 'NJ', 'Bergen', 40.7851, -74.1321),
('07032', 'Kearny', 'NJ', 'Hudson', 40.7684, -74.1454),
('07033', 'Kenilworth', 'NJ', 'Union', 40.6768, -74.2913),
('07034', 'Lake Hiawatha', 'NJ', 'Morris', 40.8826, -74.3838),
('07035', 'Lincoln Park', 'NJ', 'Morris', 40.9243, -74.3004),
('07036', 'Linden', 'NJ', 'Union', 40.6218, -74.2446),
('07037', 'Linden', 'NJ', 'Union', 40.6218, -74.2446),
('07039', 'Livingston', 'NJ', 'Essex', 40.7957, -74.3149),
('07040', 'Maplewood', 'NJ', 'Essex', 40.7312, -74.2735),
('07041', 'Millburn', 'NJ', 'Essex', 40.7290, -74.3121),
('07042', 'Montclair', 'NJ', 'Essex', 40.8168, -74.2090),
('07043', 'Montclair', 'NJ', 'Essex', 40.8168, -74.2090),
('07044', 'Verona', 'NJ', 'Essex', 40.8301, -74.2390),
('07045', 'Montville', 'NJ', 'Morris', 40.9029, -74.3576),
('07046', 'Mountain Lakes', 'NJ', 'Morris', 40.8926, -74.4393),
('07047', 'North Bergen', 'NJ', 'Hudson', 40.8043, -74.0121),
('07050', 'Orange', 'NJ', 'Essex', 40.7707, -74.2321),
('07501', 'Paterson', 'NJ', 'Passaic', 40.9168, -74.1718),
('08701', 'Lakewood', 'NJ', 'Ocean', 40.0979, -74.2177),
('08901', 'New Brunswick', 'NJ', 'Middlesex', 40.4862, -74.4518);

-- Seed vehicles table with sample fleet
INSERT INTO vehicles (name, type, capacity_lbs, service_area, base_location_zip, base_location_lat, base_location_lng, notes) VALUES
('QCS Truck 1', 'truck', 2000, '{"service_areas": ["North Jersey", "Hudson County", "Bergen County"], "max_radius_miles": 25}', '07030', 40.7439, -74.0324, 'Primary delivery vehicle for North Jersey area'),
('QCS Truck 2', 'truck', 1500, '{"service_areas": ["Central Jersey", "Middlesex County", "Union County"], "max_radius_miles": 30}', '08901', 40.4862, -74.4518, 'Central Jersey service vehicle'),
('QCS Van 1', 'van', 800, '{"service_areas": ["Local deliveries", "Essex County"], "max_radius_miles": 20}', '07017', 40.7673, -74.2049, 'Small package and local delivery van'),
('QCS Truck 3', 'truck', 2500, '{"service_areas": ["Long distance", "Ocean County", "Monmouth County"], "max_radius_miles": 50}', '08701', 40.0979, -74.2177, 'Heavy capacity truck for large shipments');

-- Seed availability_overrides with holidays and blackout dates for 2025
INSERT INTO availability_overrides (date, is_closed, reason) VALUES
('2025-01-01', true, 'New Years Day'),
('2025-01-20', true, 'Martin Luther King Jr. Day'),
('2025-02-17', true, 'Presidents Day'),
('2025-05-26', true, 'Memorial Day'),
('2025-07-04', true, 'Independence Day'),
('2025-09-01', true, 'Labor Day'),
('2025-10-13', true, 'Columbus Day'),
('2025-11-11', true, 'Veterans Day'),
('2025-11-27', true, 'Thanksgiving Day'),
('2025-11-28', true, 'Black Friday - Limited Service'),
('2025-12-25', true, 'Christmas Day'),
('2025-12-31', true, 'New Years Eve');

-- Add special operating hours for some days
INSERT INTO availability_overrides (date, is_closed, open_time, close_time, reason) VALUES
('2025-07-03', false, '08:00', '14:00', 'Early closure before Independence Day'),
('2025-11-26', false, '08:00', '14:00', 'Early closure before Thanksgiving'),
('2025-12-24', false, '08:00', '12:00', 'Christmas Eve - Half Day');

-- Seed some capacity blocks for testing
INSERT INTO capacity_blocks (window_start, window_end, max_lbs, note) VALUES
('2025-09-05 09:00:00+00', '2025-09-05 17:00:00+00', 1000, 'Maintenance day - reduced capacity'),
('2025-09-12 14:00:00+00', '2025-09-12 18:00:00+00', 500, 'Training session - limited capacity');

-- Update the HQ location function with actual QCS Cargo coordinates (using Hoboken as example)
CREATE OR REPLACE FUNCTION get_hq_location() 
RETURNS GEOMETRY AS $$
BEGIN
    RETURN ST_SetSRID(ST_MakePoint(-74.0324, 40.7439), 4326); -- Hoboken, NJ coordinates
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to calculate business hours windows
CREATE OR REPLACE FUNCTION get_business_hours(check_date DATE)
RETURNS TABLE(open_time TIME, close_time TIME, is_closed BOOLEAN) AS $$
DECLARE
    override_record availability_overrides%ROWTYPE;
BEGIN
    -- Check for availability overrides first
    SELECT * INTO override_record FROM availability_overrides WHERE date = check_date;
    
    IF FOUND THEN
        -- Use override values
        RETURN QUERY SELECT 
            COALESCE(override_record.open_time, '08:00'::TIME),
            COALESCE(override_record.close_time, '17:00'::TIME),
            override_record.is_closed;
    ELSE
        -- Use default business hours (8 AM - 5 PM, Monday-Friday)
        IF EXTRACT(DOW FROM check_date) IN (0, 6) THEN
            -- Weekend - closed
            RETURN QUERY SELECT '08:00'::TIME, '17:00'::TIME, true;
        ELSE
            -- Weekday - open
            RETURN QUERY SELECT '08:00'::TIME, '17:00'::TIME, false;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;;
