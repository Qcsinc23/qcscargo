import { 
    calculateVehicleCapacityForWindow, 
    findBestVehicle, 
    validateBookingCapacity,
    type Booking,
    type Vehicle,
    type TimeWindow
} from "../_shared/capacity-utils.ts";
import { 
    validateAndSanitizeRequest, 
    createValidationErrorResponse,
    checkRateLimit,
    createRateLimitResponse,
    logValidationError
} from "../_shared/validation-utils.ts";
import { createBookingSchema } from "../../../src/lib/validation/schemas.ts";

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
        // Parse and validate request body FIRST
        const requestBody = await req.json();
        const validation = validateAndSanitizeRequest(createBookingSchema, requestBody);

        // Rate limiting check
        const rateLimitUserId = req.headers.get('x-user-id') || 'anonymous';
        const rateLimit = checkRateLimit(rateLimitUserId, 'create-booking', 5, 60000); // 5 requests per minute

        if (!rateLimit.allowed) {
            return createRateLimitResponse(rateLimit.resetTime);
        }

        if (!validation.success) {
            logValidationError('create-booking', validation.errors!, rateLimitUserId);
            return createValidationErrorResponse(validation.errors!);
        }

        // Use validated data
        const validatedData = validation.data!;

        // Extract validated data
        const {
            quote_id,
            shipment_id,
            window_start,
            window_end,
            address,
            pickup_or_drop,
            service_type,
            estimated_weight,
            notes,
            idempotency_key
        } = validatedData;

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

        // Use atomic booking creation procedure for proper transaction management
        console.log('Creating booking using atomic procedure...');
        
        const atomicBookingResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/create_booking_atomic`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                p_customer_id: userId,
                p_quote_id: quote_id || null,
                p_shipment_id: shipment_id || null,
                p_pickup_or_drop: pickup_or_drop,
                p_window_start: window_start,
                p_window_end: window_end,
                p_address: address,
                p_service_type: service_type,
                p_estimated_weight: estimated_weight,
                p_notes: notes || null,
                p_idempotency_key: idempotency_key
            })
        });

        if (!atomicBookingResponse.ok) {
            const errorText = await atomicBookingResponse.text();
            console.error('Atomic booking creation failed:', errorText);
            throw new Error(`Booking creation failed: ${errorText}`);
        }

        const atomicResult = await atomicBookingResponse.json();
        console.log('Atomic booking result:', atomicResult);

        const result = {
            data: atomicResult
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