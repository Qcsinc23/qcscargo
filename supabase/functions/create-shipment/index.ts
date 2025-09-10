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

        // Enhanced validation
        if (!destination_id || !service_level || !items || !Array.isArray(items) || items.length === 0) {
            throw new Error('Missing required fields: destination_id, service_level, and items array');
        }

        // Validate each item
        for (const item of items) {
            if (!item.description || !item.weight || !item.quantity) {
                throw new Error('Each item must have description, weight, and quantity');
            }
            if (parseFloat(item.weight) <= 0 || parseInt(item.quantity) <= 0) {
                throw new Error('Item weight and quantity must be greater than 0');
            }
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
            const errorText = await userResponse.text();
            throw new Error(`Invalid authentication token: ${errorText}`);
        }

        const userData = await userResponse.json();
        const customerId = userData.id;

        // Calculate total weight and validate items
        let totalWeight = 0;
        for (const item of items) {
            totalWeight += parseFloat(item.weight) * parseInt(item.quantity);
        }

        // Generate tracking number
        const trackingNumber = `QCS${Date.now()}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;

        // Create the main shipment record with proper schema alignment
        const shipmentData = {
            tracking_number: trackingNumber,
            customer_id: customerId,
            destination_id: parseInt(destination_id), // Ensure integer type
            service_type: service_level, // Map service_level to service_type
            status: 'pending_pickup',
            pickup_scheduled_at: pickup_date || null,
            special_instructions: special_instructions || '',
            total_declared_value: declared_value ? parseFloat(declared_value) : null,
            total_weight: totalWeight,
            origin_address: 'QCS Cargo - New Jersey' // Default origin
        };

        console.log('Creating shipment with data:', shipmentData);
        console.log('Supabase URL:', supabaseUrl);
        console.log('Service Role Key present:', !!serviceRoleKey);

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
            console.error('Shipment creation failed with status:', shipmentResponse.status);
            console.error('Error details:', errorText);
            console.error('Request headers:', {
                'Authorization': `Bearer ${serviceRoleKey.substring(0, 10)}...`,
                'apikey': serviceRoleKey.substring(0, 10) + '...',
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            });
            throw new Error(`Failed to create shipment: HTTP ${shipmentResponse.status} - ${errorText}`);
        }

        const shipmentResult = await shipmentResponse.json();
        console.log('Raw shipment response:', shipmentResult);
        
        if (!Array.isArray(shipmentResult) || shipmentResult.length === 0) {
            console.error('Unexpected response format:', shipmentResult);
            throw new Error('Shipment creation returned unexpected response format');
        }
        
        const shipment = shipmentResult[0];
        const shipmentId = shipment.id;

        console.log('Shipment created successfully with ID:', shipmentId);
        console.log('Full shipment details:', shipment);

        // Insert shipment items with proper schema alignment
        const shipmentItems = items.map(item => ({
            shipment_id: shipmentId, // Use the returned shipment ID
            description: item.description,
            weight_lbs: parseFloat(item.weight), // Align with schema
            quantity: parseInt(item.quantity),
            length_inches: item.length ? parseFloat(item.length) : null,
            width_inches: item.width ? parseFloat(item.width) : null,
            height_inches: item.height ? parseFloat(item.height) : null,
            declared_value: item.value ? parseFloat(item.value) : 0, // Required field, default to 0
            category: item.category || 'general',
            notes: item.notes || ''
        }));

        console.log('Creating shipment items:', shipmentItems);

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
            console.error('Failed to insert shipment items:', errorText);
            // Don't fail the entire operation, but log the error
            console.error('Shipment created but items insertion failed');
        }

        const insertedItems = itemsResponse.ok ? await itemsResponse.json() : [];

        // Create initial tracking entry (optional - only if tracking table exists)
        try {
            const trackingData = {
                shipment_id: shipmentId,
                status: 'created',
                location: 'QCS Cargo - New Jersey',
                notes: 'Shipment created and pending pickup',
                timestamp: new Date().toISOString()
            };

            await fetch(`${supabaseUrl}/rest/v1/shipment_tracking`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(trackingData)
            });
        } catch (trackingError) {
            console.log('Tracking entry creation skipped (table may not exist)');
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
                message: error.message,
                details: error.stack || 'No additional details available'
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});