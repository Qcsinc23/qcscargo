Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const { vehicle_id, date } = await req.json();

        if (!vehicle_id) {
            throw new Error('Vehicle ID is required');
        }

        console.log('Fetching vehicle details for ID:', vehicle_id, 'Date:', date);

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Fetch vehicle details using service role key (bypasses RLS)
        const vehicleResponse = await fetch(`${supabaseUrl}/rest/v1/vehicles?id=eq.${vehicle_id}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!vehicleResponse.ok) {
            const errorText = await vehicleResponse.text();
            console.error('Failed to fetch vehicle:', errorText);
            throw new Error('Failed to fetch vehicle details');
        }

        const vehicles = await vehicleResponse.json();
        
        if (vehicles.length === 0) {
            throw new Error('Vehicle not found');
        }

        const vehicle = vehicles[0];
        console.log('Found vehicle:', vehicle.name);

        // Set up date range for booking queries
        const selectedDate = date || new Date().toISOString().split('T')[0];
        const startOfDay = `${selectedDate}T00:00:00.000Z`;
        const endOfDay = `${selectedDate}T23:59:59.999Z`;

        console.log('Fetching bookings for date range:', startOfDay, 'to', endOfDay);

        // Fetch assigned bookings for this vehicle and selected date
        const assignedBookingsResponse = await fetch(
            `${supabaseUrl}/rest/v1/bookings?assigned_vehicle_id=eq.${vehicle_id}&window_start=gte.${startOfDay}&window_end=lte.${endOfDay}&order=window_start`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        let assignedBookings = [];
        if (assignedBookingsResponse.ok) {
            assignedBookings = await assignedBookingsResponse.json();
            console.log('Found', assignedBookings.length, 'assigned bookings');
        } else {
            console.error('Failed to fetch assigned bookings:', await assignedBookingsResponse.text());
        }

        // Fetch available (unassigned) bookings for the selected date
        const availableBookingsResponse = await fetch(
            `${supabaseUrl}/rest/v1/bookings?assigned_vehicle_id=is.null&status=in.(pending,confirmed)&window_start=gte.${startOfDay}&window_end=lte.${endOfDay}&order=window_start`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        let availableBookings = [];
        if (availableBookingsResponse.ok) {
            availableBookings = await availableBookingsResponse.json();
            console.log('Found', availableBookings.length, 'available bookings');
        } else {
            console.error('Failed to fetch available bookings:', await availableBookingsResponse.text());
        }

        // Calculate vehicle stats
        const totalWeight = assignedBookings.reduce((sum, booking) => sum + (parseFloat(booking.estimated_weight) || 0), 0);
        const completedCount = assignedBookings.filter(b => b.status === 'completed').length;
        const pendingCount = assignedBookings.filter(b => b.status === 'pending').length;
        const confirmedCount = assignedBookings.filter(b => b.status === 'confirmed').length;
        
        const utilizationRate = vehicle.capacity_lbs > 0 ? (totalWeight / vehicle.capacity_lbs) * 100 : 0;
        const utilizationScore = Math.min(utilizationRate * 0.6, 60);
        const bookingScore = Math.min(assignedBookings.length * 10, 40);
        const efficiencyScore = Math.round(utilizationScore + bookingScore);

        const stats = {
            total_bookings: assignedBookings.length,
            completed_bookings: completedCount,
            pending_bookings: pendingCount,
            confirmed_bookings: confirmedCount,
            total_weight_hauled: totalWeight,
            avg_utilization_rate: utilizationRate,
            efficiency_score: efficiencyScore
        };

        const result = {
            data: {
                vehicle,
                assignedBookings,
                availableBookings,
                stats,
                selectedDate
            }
        };

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Admin get vehicle details error:', error);

        const errorResponse = {
            error: {
                code: 'GET_VEHICLE_DETAILS_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
