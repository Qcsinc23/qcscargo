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
        const { action = 'list', date } = await req.json();

        console.log('Admin vehicles request:', { action, date });

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        let result = {};

        if (action === 'list') {
            // Fetch all active vehicles using service role key (bypasses RLS)
            const vehiclesResponse = await fetch(`${supabaseUrl}/rest/v1/vehicles?active=eq.true&order=name`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!vehiclesResponse.ok) {
                const errorText = await vehiclesResponse.text();
                console.error('Failed to fetch vehicles:', errorText);
                throw new Error('Failed to fetch vehicles');
            }

            const vehicles = await vehiclesResponse.json();
            console.log('Found', vehicles.length, 'active vehicles');

            // If date is provided, also fetch current capacity utilization
            if (date) {
                const targetDate = date;
                const startOfDay = `${targetDate}T00:00:00.000Z`;
                const endOfDay = `${targetDate}T23:59:59.999Z`;

                // Fetch bookings for the target date to calculate capacity utilization
                const bookingsResponse = await fetch(
                    `${supabaseUrl}/rest/v1/bookings?window_start=gte.${startOfDay}&window_end=lte.${endOfDay}&status=in.(pending,confirmed)`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                let bookings = [];
                if (bookingsResponse.ok) {
                    bookings = await bookingsResponse.json();
                } else {
                    console.error('Failed to fetch bookings for capacity calculation');
                }

                // Calculate capacity utilization for each vehicle
                const vehiclesWithCapacity = vehicles.map(vehicle => {
                    const vehicleBookings = bookings.filter(b => b.assigned_vehicle_id === vehicle.id);
                    const usedCapacity = vehicleBookings.reduce((sum, b) => sum + (parseFloat(b.estimated_weight) || 0), 0);
                    const remainingCapacity = vehicle.capacity_lbs - usedCapacity;
                    const utilizationRate = vehicle.capacity_lbs > 0 ? (usedCapacity / vehicle.capacity_lbs) * 100 : 0;

                    return {
                        ...vehicle,
                        capacity_info: {
                            total_capacity_lbs: vehicle.capacity_lbs,
                            used_capacity_lbs: Math.round(usedCapacity),
                            remaining_capacity_lbs: Math.round(remainingCapacity),
                            utilization_rate: parseFloat(utilizationRate.toFixed(1)),
                            current_bookings: vehicleBookings.length
                        }
                    };
                });

                result = { vehicles: vehiclesWithCapacity, date: targetDate };
            } else {
                result = { vehicles };
            }
        } else {
            throw new Error(`Unknown action: ${action}`);
        }

        const response = {
            data: result,
            meta: {
                action,
                date,
                generated_at: new Date().toISOString()
            }
        };

        return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Admin vehicles error:', error);

        const errorResponse = {
            error: {
                code: 'ADMIN_VEHICLES_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
