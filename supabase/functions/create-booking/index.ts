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
        const { 
            quote_id, 
            shipment_id, 
            window_start, 
            window_end, 
            address, 
            pickup_or_drop, 
            service_type = 'standard',
            estimated_weight,
            notes,
            idempotency_key 
        } = await req.json();

        console.log('Create booking request:', { 
            quote_id, 
            shipment_id, 
            window_start, 
            window_end, 
            pickup_or_drop,
            service_type,
            estimated_weight,
            idempotency_key 
        });

        // Validate required parameters
        if (!window_start || !window_end) {
            throw new Error('Window start and end times are required');
        }

        if (!address) {
            throw new Error('Address is required');
        }

        if (!pickup_or_drop || !['pickup', 'dropoff'].includes(pickup_or_drop)) {
            throw new Error('pickup_or_drop must be either "pickup" or "dropoff"');
        }

        if (!estimated_weight || estimated_weight <= 0) {
            throw new Error('Valid estimated weight is required');
        }

        if (!idempotency_key) {
            throw new Error('Idempotency key is required');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Get user from auth header
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('No authorization header');
        }

        const token = authHeader.replace('Bearer ', '');

        // Verify token and get user
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': serviceRoleKey
            }
        });

        if (!userResponse.ok) {
            throw new Error('Invalid authentication token');
        }

        const userData = await userResponse.json();
        const userId = userData.id;

        console.log('User authenticated:', userId);

        // Check for existing booking with same idempotency key (idempotency guarantee)
        const existingBookingResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?idempotency_key=eq.${idempotency_key}&select=*`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (existingBookingResponse.ok) {
            const existingBookings = await existingBookingResponse.json();
            if (existingBookings.length > 0) {
                console.log('Returning existing booking for idempotency key:', idempotency_key);
                return new Response(JSON.stringify({
                    data: {
                        booking: existingBookings[0],
                        created: false,
                        message: 'Booking already exists with this idempotency key'
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        // Validate window times
        const startTime = new Date(window_start);
        const endTime = new Date(window_end);
        const now = new Date();

        if (startTime <= now) {
            throw new Error('Cannot book for past time slots');
        }

        if (endTime <= startTime) {
            throw new Error('Window end must be after window start');
        }

        // Use PostgreSQL advisory lock to prevent race conditions
        const lockId = Math.abs(idempotency_key.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0));

        console.log('Acquiring advisory lock:', lockId);

        // Start transaction with advisory lock
        const lockResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/pg_advisory_xact_lock`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ lock_id: lockId })
        });

        // Re-check availability within the transaction
        console.log('Re-checking availability in transaction...');
        
        // Get available vehicles
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
        if (vehicles.length === 0) {
            throw new Error('No vehicles available');
        }

        // Check for conflicting bookings in the requested window
        const conflictQuery = `
            SELECT 
                b.*,
                va.vehicle_id,
                v.capacity_lbs,
                v.name as vehicle_name
            FROM bookings b
            LEFT JOIN vehicle_assignments va ON b.id = va.booking_id
            LEFT JOIN vehicles v ON va.vehicle_id = v.id
            WHERE b.status IN ('pending', 'confirmed')
            AND tstzrange(b.window_start, b.window_end) && tstzrange('${window_start}', '${window_end}')
            ORDER BY va.vehicle_id;
        `;

        const conflictResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: conflictQuery })
        });

        let conflictingBookings = [];
        if (conflictResponse.ok) {
            conflictingBookings = await conflictResponse.json();
        }

        console.log('Found conflicting bookings:', conflictingBookings.length);

        // Calculate remaining capacity per vehicle
        const vehicleCapacity = {};
        vehicles.forEach(v => {
            vehicleCapacity[v.id] = {
                total: v.capacity_lbs,
                used: 0,
                remaining: v.capacity_lbs,
                name: v.name
            };
        });

        // Sum up used capacity
        conflictingBookings.forEach(booking => {
            if (booking.vehicle_id && vehicleCapacity[booking.vehicle_id]) {
                const weight = parseFloat(booking.estimated_weight) || 0;
                vehicleCapacity[booking.vehicle_id].used += weight;
                vehicleCapacity[booking.vehicle_id].remaining -= weight;
            }
        });

        // Find best vehicle (most remaining capacity)
        let selectedVehicle = null;
        let maxRemainingCapacity = 0;
        
        Object.keys(vehicleCapacity).forEach(vehicleId => {
            const capacity = vehicleCapacity[vehicleId];
            if (capacity.remaining >= estimated_weight && capacity.remaining > maxRemainingCapacity) {
                selectedVehicle = {
                    id: vehicleId,
                    ...capacity
                };
                maxRemainingCapacity = capacity.remaining;
            }
        });

        if (!selectedVehicle) {
            throw new Error('No vehicle with sufficient capacity available for this time window');
        }

        console.log('Selected vehicle:', selectedVehicle.name, 'with', selectedVehicle.remaining, 'lbs remaining capacity');

        // Create the booking
        const bookingData = {
            customer_id: userId,
            quote_id: quote_id || null,
            shipment_id: shipment_id || null,
            pickup_or_drop,
            window_start,
            window_end,
            address,
            service_type,
            estimated_weight,
            notes: notes || null,
            idempotency_key,
            zip_code: address.zip_code || null,
            address_lat: address.latitude || null,
            address_lng: address.longitude || null
        };

        console.log('Creating booking with data:', bookingData);

        const createBookingResponse = await fetch(`${supabaseUrl}/rest/v1/bookings`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(bookingData)
        });

        if (!createBookingResponse.ok) {
            const errorText = await createBookingResponse.text();
            console.error('Failed to create booking:', errorText);
            throw new Error(`Failed to create booking: ${errorText}`);
        }

        const booking = await createBookingResponse.json();
        const createdBooking = booking[0];

        console.log('Booking created:', createdBooking.id);

        // Assign vehicle to booking
        const assignmentData = {
            booking_id: createdBooking.id,
            vehicle_id: selectedVehicle.id,
            assigned_by: userId,
            notes: `Auto-assigned vehicle ${selectedVehicle.name} with ${selectedVehicle.remaining}lbs remaining capacity`
        };

        const assignmentResponse = await fetch(`${supabaseUrl}/rest/v1/vehicle_assignments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(assignmentData)
        });

        if (!assignmentResponse.ok) {
            const errorText = await assignmentResponse.text();
            console.error('Failed to create vehicle assignment:', errorText);
            // Booking is created but assignment failed - log error but don't fail entire operation
            console.warn('Vehicle assignment failed, booking created without assignment');
        } else {
            console.log('Vehicle assigned successfully');
        }

        // Update booking status to confirmed
        const confirmBookingResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${createdBooking.id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'confirmed' })
        });

        if (!confirmBookingResponse.ok) {
            console.warn('Failed to confirm booking status');
        }

        const result = {
            data: {
                booking: {
                    ...createdBooking,
                    status: 'confirmed',
                    assigned_vehicle: {
                        id: selectedVehicle.id,
                        name: selectedVehicle.name,
                        capacity_lbs: selectedVehicle.total
                    }
                },
                created: true,
                message: 'Booking created successfully'
            }
        };

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Create booking error:', error);

        const errorResponse = {
            error: {
                code: 'BOOKING_CREATION_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});