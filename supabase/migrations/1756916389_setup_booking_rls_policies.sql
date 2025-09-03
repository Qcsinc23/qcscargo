-- Migration: setup_booking_rls_policies
-- Created at: 1756916389

-- Enable RLS on booking tables
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacity_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE postal_geos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bookings table
-- Customers can only see their own bookings
CREATE POLICY "Users can view own bookings" ON bookings
    FOR SELECT USING (auth.uid() = customer_id);

-- Customers can insert their own bookings
CREATE POLICY "Users can insert own bookings" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Customers can update their own bookings (limited to certain fields)
CREATE POLICY "Users can update own bookings" ON bookings
    FOR UPDATE USING (auth.uid() = customer_id)
    WITH CHECK (auth.uid() = customer_id);

-- Staff/Admin can see all bookings (assuming staff role in JWT claims)
CREATE POLICY "Staff can view all bookings" ON bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' IN ('staff', 'admin')
        )
    );

-- Staff/Admin can manage all bookings
CREATE POLICY "Staff can manage all bookings" ON bookings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' IN ('staff', 'admin')
        )
    );

-- RLS Policies for vehicle_assignments
CREATE POLICY "Users can view vehicle assignments for own bookings" ON vehicle_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = vehicle_assignments.booking_id 
            AND bookings.customer_id = auth.uid()
        )
    );

CREATE POLICY "Staff can manage vehicle assignments" ON vehicle_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' IN ('staff', 'admin')
        )
    );

-- RLS Policies for vehicles table (read-only for customers, full access for staff)
CREATE POLICY "Anyone can view active vehicles" ON vehicles
    FOR SELECT USING (active = true);

CREATE POLICY "Staff can manage vehicles" ON vehicles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' IN ('staff', 'admin')
        )
    );

-- RLS Policies for availability_overrides (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view availability overrides" ON availability_overrides
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can manage availability overrides" ON availability_overrides
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' IN ('staff', 'admin')
        )
    );

-- RLS Policies for capacity_blocks
CREATE POLICY "Authenticated users can view capacity blocks" ON capacity_blocks
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can manage capacity blocks" ON capacity_blocks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' IN ('staff', 'admin')
        )
    );

-- RLS Policies for postal_geos (read-only for all)
CREATE POLICY "Anyone can view postal geographic data" ON postal_geos
    FOR SELECT USING (true);;