 // @ts-nocheck

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
        const { date, estimated_weight_lbs, pickup_or_drop, zip_code, service_type = 'standard' } = await req.json();

        console.log('Get available windows request:', { date, estimated_weight_lbs, pickup_or_drop, zip_code, service_type });

        // Validate required parameters
        if (!date) {
            throw new Error('Date is required');
        }

        if (!estimated_weight_lbs || estimated_weight_lbs <= 0) {
            throw new Error('Valid estimated weight is required');
        }

        if (!pickup_or_drop || !['pickup', 'dropoff'].includes(pickup_or_drop)) {
            throw new Error('pickup_or_drop must be either "pickup" or "dropoff"');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        const requestDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Don't allow booking for past dates
        if (requestDate < today) {
            throw new Error('Cannot book for past dates');
        }

        // Don't allow booking more than 30 days in advance
        const maxDate = new Date(today);
        maxDate.setDate(maxDate.getDate() + 30);
        if (requestDate > maxDate) {
            throw new Error('Cannot book more than 30 days in advance');
        }

        console.log('Checking business hours for date:', date);

        // Get business hours for the requested date using the new function
        const businessHoursResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/get_business_hours`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ check_date: requestDate.toISOString().split('T')[0] })
        });

        if (!businessHoursResponse.ok) {
            const errorText = await businessHoursResponse.text();
            console.error('Failed to get business hours:', errorText);
            throw new Error('Failed to check business hours');
        }

        const businessHours = await businessHoursResponse.json();
        console.log('Business hours result:', businessHours);

        // Check if closed that day
        if (businessHours.length > 0 && businessHours[0].is_closed) {
            const closureMessage = businessHours[0].is_holiday 
                ? `Closed for ${businessHours[0].holiday_name || 'holiday'}`
                : `Closed on ${businessHours[0].day_name?.trim() || 'this day'}`;
                
            return new Response(JSON.stringify({
                data: {
                    available_windows: [],
                    reason: 'Closed',
                    message: closureMessage,
                    is_holiday: businessHours[0].is_holiday,
                    holiday_name: businessHours[0].holiday_name
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Get business hours - no fallback to hardcoded times
        if (!businessHours.length || !businessHours[0].open_time || !businessHours[0].close_time) {
            return new Response(JSON.stringify({
                data: {
                    available_windows: [],
                    reason: 'No Hours Configured',
                    message: 'Business hours not configured for this date'
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const openTime = businessHours[0].open_time;
        const closeTime = businessHours[0].close_time;

        console.log('Business hours:', { openTime, closeTime, day_name: businessHours[0].day_name });

        // Calculate distance if ZIP code is provided using PostGIS
        let distance_miles = null;
        let pickup_location_name = null;
        
        if (zip_code && pickup_or_drop === 'pickup') {
            console.log('Calculating distance for ZIP:', zip_code);
            
            try {
                // Use PostGIS to calculate distance from HQ to pickup location
                const distanceQuery = `
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
                    WHERE pg.zip_code = '${zip_code}'
                    LIMIT 1;
                `;
                
                // Use RPC call to execute the PostGIS query
                const distanceResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_distance_query`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        query_zip: zip_code
                    })
                });

                if (distanceResponse.ok) {
                    const distanceData = await distanceResponse.json();
                    console.log('PostGIS distance query result:', distanceData);
                    
                    if (distanceData && distanceData.length > 0) {
                        const locationData = distanceData[0];
                        distance_miles = parseFloat(locationData.distance_miles);
                        pickup_location_name = `${locationData.city}, ${locationData.state}`;
                        
                        console.log(`Distance to ${pickup_location_name}:`, distance_miles, 'miles');
                        
                        // Block pickups beyond 25 miles
                        if (distance_miles > 25) {
                            return new Response(JSON.stringify({
                                data: {
                                    available_windows: [],
                                    reason: 'Out of Service Area',
                                    message: `Pickup location in ${pickup_location_name} (${distance_miles.toFixed(1)} miles away) is beyond our 25-mile service radius. Please choose drop-off or contact support for special arrangements.`,
                                    distance_miles,
                                    max_service_radius: 25,
                                    pickup_location: pickup_location_name
                                }
                            }), {
                                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                            });
                        }
                    } else {
                        console.log('ZIP code not found in postal_geos table:', zip_code);
                        // Still allow booking if ZIP not in our database
                        distance_miles = null;
                        pickup_location_name = `ZIP ${zip_code}`;
                    }
                } else {
                    console.log('Failed to execute PostGIS distance query:', distanceResponse.status);
                    // Fallback: Allow booking but without distance validation
                    distance_miles = null;
                    pickup_location_name = `ZIP ${zip_code}`;
                }
            } catch (error) {
                console.error('Error calculating pickup distance:', error);
                // Fallback: Allow booking but log the error
                distance_miles = null;
                pickup_location_name = `ZIP ${zip_code}`;
            }
        }

        // Get active vehicles
        console.log('Fetching active vehicles...');
        
        const vehiclesResponse = await fetch(`${supabaseUrl}/rest/v1/vehicles?active=eq.true&select=*`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!vehiclesResponse.ok) {
            throw new Error('Failed to fetch vehicles');
        }

        const vehicles = await vehiclesResponse.json();
        console.log('Found vehicles:', vehicles.length);

        if (vehicles.length === 0) {
            return new Response(JSON.stringify({
                data: {
                    available_windows: [],
                    reason: 'No Vehicles Available',
                    message: 'No vehicles available for this service'
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Generate 2-hour time windows throughout the business day
        const windows = [];
        const startHour = parseInt(openTime.split(':')[0]);
        const endHour = parseInt(closeTime.split(':')[0]);
        
        for (let hour = startHour; hour < endHour - 1; hour++) {
            const windowStart = new Date(requestDate);
            windowStart.setHours(hour, 0, 0, 0);
            
            const windowEnd = new Date(windowStart);
            windowEnd.setHours(hour + 2, 0, 0, 0);
            
            // Skip windows in the past for today
            const now = new Date();
            if (requestDate.toDateString() === now.toDateString() && windowStart <= now) {
                continue;
            }
            
            windows.push({
                start: windowStart.toISOString(),
                end: windowEnd.toISOString(),
                display: `${windowStart.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })} - ${windowEnd.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}`
            });
        }

        console.log('Generated windows:', windows.length);

        // Check availability for each window
        const availableWindows = [];
        
        for (const window of windows) {
            console.log('Checking availability for window:', window.display);
            
            // Check existing bookings in this window across all vehicles
            const bookingsQuery = `select=*,vehicle_assignments(*,vehicles(*))&status=in.(pending,confirmed)&window_start=lte.${window.end}&window_end=gte.${window.start}`;
            const bookingsResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?${bookingsQuery}`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            });

            let existingBookings = [];
            if (bookingsResponse.ok) {
                existingBookings = await bookingsResponse.json();
            }

            console.log('Existing bookings in window:', existingBookings.length);

            // Calculate capacity for each vehicle
            const vehicleCapacity = {};
            vehicles.forEach(v => {
                vehicleCapacity[v.id] = {
                    total: v.capacity_lbs,
                    used: 0,
                    remaining: v.capacity_lbs,
                    name: v.name
                };
            });

            // Sum up used capacity per vehicle
            existingBookings.forEach(booking => {
                if (booking.vehicle_assignments && booking.vehicle_assignments.length > 0) {
                    const assignment = booking.vehicle_assignments[0];
                    if (assignment.vehicle_id && vehicleCapacity[assignment.vehicle_id]) {
                        const weight = parseFloat(booking.estimated_weight) || 0;
                        vehicleCapacity[assignment.vehicle_id].used += weight;
                        vehicleCapacity[assignment.vehicle_id].remaining -= weight;
                    }
                }
            });

            // Find vehicle with enough capacity
            let bestVehicle = null;
            let maxRemainingCapacity = 0;
            
            Object.keys(vehicleCapacity).forEach(vehicleId => {
                const capacity = vehicleCapacity[vehicleId];
                if (capacity.remaining >= estimated_weight_lbs && capacity.remaining > maxRemainingCapacity) {
                    bestVehicle = {
                        id: vehicleId,
                        ...capacity
                    };
                    maxRemainingCapacity = capacity.remaining;
                }
            });

            if (bestVehicle) {
                availableWindows.push({
                    start: window.start,
                    end: window.end,
                    display: window.display,
                    remaining_capacity_lbs: bestVehicle.remaining,
                    assigned_vehicle: {
                        id: bestVehicle.id,
                        name: bestVehicle.name,
                        capacity_lbs: bestVehicle.total
                    },
                    estimated_travel_time_minutes: distance_miles ? Math.ceil(distance_miles * 2.5) : null, // 2.5 minutes per mile estimate
                    pickup_location: pickup_location_name
                });
            }
        }

        console.log('Available windows found:', availableWindows.length);

        const result = {
            data: {
                available_windows: availableWindows,
                request_details: {
                    date,
                    pickup_or_drop,
                    estimated_weight_lbs,
                    service_type,
                    zip_code,
                    distance_miles,
                    pickup_location: pickup_location_name
                },
                business_hours: {
                    open_time: openTime,
                    close_time: closeTime,
                    is_closed: businessHours[0]?.is_closed || false
                }
            }
        };

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Get available windows error:', error);

        const errorResponse = {
            error: {
                code: 'AVAILABILITY_CHECK_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
