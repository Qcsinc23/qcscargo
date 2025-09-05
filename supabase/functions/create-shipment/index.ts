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
        // Extract shipment data from request body
        const requestData = await req.json();
        const {
            destination_id,
            service_level,
            pickup_date,
            special_instructions,
            declared_value,
            items // Array of shipment items
        } = requestData;

        // Validate required fields
        if (!destination_id || !service_level || !items || !Array.isArray(items) || items.length === 0) {
            throw new Error('Missing required fields: destination_id, service_level, and items array');
        }

        // Get Supabase configuration
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        // Get user from auth header
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('No authorization header provided');
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
        const customerId = userData.id;

        // Calculate total weight and validate items
        let totalWeight = 0;
        for (const item of items) {
            if (!item.description || !item.weight || !item.quantity) {
                throw new Error('Each item must have description, weight, and quantity');
            }
            totalWeight += parseFloat(item.weight) * parseInt(item.quantity);
        }

        // Generate tracking number
        const trackingNumber = `QCS${Date.now()}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;

        // Create the main shipment record
        const shipmentData = {
            tracking_number: trackingNumber,
            customer_id: customerId,
            destination_id,
            service_type: service_level, // Map service_level to service_type
            status: 'pending_pickup',
            pickup_scheduled_at: pickup_date || null,
            special_instructions: special_instructions || '',
            total_declared_value: declared_value ? parseFloat(declared_value) : null,
            total_weight: totalWeight,
            weight_lbs: totalWeight // Also set weight_lbs for compatibility
        };

        const shipmentResponse = await fetch(`${supabaseUrl}/rest/v1/shipments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(shipmentData)
        });

        if (!shipmentResponse.ok) {
            const errorText = await shipmentResponse.text();
            throw new Error(`Failed to create shipment: ${errorText}`);
        }

        const shipmentResult = await shipmentResponse.json();
        const shipment = shipmentResult[0];
        const shipmentId = shipment.id;

        // Insert shipment items
        const shipmentItems = items.map(item => ({
            shipment_id: shipmentId,
            description: item.description,
            weight_lbs: parseFloat(item.weight), // Use weight_lbs instead of weight
            quantity: parseInt(item.quantity),
            length_inches: item.length ? parseFloat(item.length) : null, // Use length_inches
            width_inches: item.width ? parseFloat(item.width) : null, // Use width_inches
            height_inches: item.height ? parseFloat(item.height) : null, // Use height_inches
            declared_value: item.value ? parseFloat(item.value) : 0, // Required field, default to 0
            category: item.category || 'general',
            notes: item.notes || ''
        }));

        const itemsResponse = await fetch(`${supabaseUrl}/rest/v1/shipment_items`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(shipmentItems)
        });

        if (!itemsResponse.ok) {
            const errorText = await itemsResponse.text();
            // If items insertion fails, we should ideally roll back the shipment
            // For now, log the error but still return the shipment ID
            console.error('Failed to insert shipment items:', errorText);
        }

        const insertedItems = itemsResponse.ok ? await itemsResponse.json() : [];

        // Create initial tracking entry
        const trackingData = {
            shipment_id: shipmentId,
            status: 'created',
            location: 'QCS Cargo - New Jersey',
            notes: 'Shipment created and pending pickup',
            timestamp: new Date().toISOString()
        };

        const trackingResponse = await fetch(`${supabaseUrl}/rest/v1/shipment_tracking`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(trackingData)
        });

        if (!trackingResponse.ok) {
            console.error('Failed to create initial tracking entry');
        }

        // Return success response with shipment details
        const result = {
            success: true,
            shipment: {
                id: shipmentId,
                tracking_number: trackingNumber,
                status: shipment.status,
                created_at: shipment.created_at,
                total_weight: totalWeight,
                item_count: items.length
            },
            items: insertedItems,
            message: 'Shipment created successfully'
        };

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Create shipment error:', error);

        const errorResponse = {
            error: {
                code: 'SHIPMENT_CREATION_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});