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
        // Extract update data from request body
        const requestData = await req.json();
        const {
            shipment_id,
            status,
            location,
            notes,
            estimated_delivery_date,
            actual_delivery_date
        } = requestData;

        // Validate required fields
        if (!shipment_id || !status) {
            throw new Error('Missing required fields: shipment_id and status');
        }

        // Validate status values
        const validStatuses = [
            'pending_pickup',
            'picked_up',
            'processing',
            'in_transit',
            'customs_clearance',
            'out_for_delivery',
            'delivered',
            'exception',
            'cancelled'
        ];

        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
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
        const userId = userData.id;

        // Check if user has permission to update this shipment
        // For now, we'll allow customers to update their own shipments and staff to update any
        const shipmentCheckResponse = await fetch(`${supabaseUrl}/rest/v1/shipments?id=eq.${shipment_id}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!shipmentCheckResponse.ok) {
            throw new Error('Failed to verify shipment');
        }

        const shipmentData = await shipmentCheckResponse.json();
        if (!shipmentData || shipmentData.length === 0) {
            throw new Error('Shipment not found');
        }

        const shipment = shipmentData[0];

        // Check if user can update this shipment
        // Allow if user owns the shipment OR if user is staff (check user_profiles table)
        let canUpdate = shipment.customer_id === userId;
        
        if (!canUpdate) {
            // Check if user is staff
            const profileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${userId}`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            if (profileResponse.ok) {
                const profiles = await profileResponse.json();
                if (profiles.length > 0) {
                    const userProfile = profiles[0];
                    canUpdate = ['admin', 'staff', 'manager'].includes(userProfile.role);
                }
            }
        }

        if (!canUpdate) {
            throw new Error('Access denied: insufficient permissions to update this shipment');
        }

        // Prepare shipment update data
        const shipmentUpdateData = {
            status,
            updated_at: new Date().toISOString()
        };

        // Add optional fields if provided
        if (estimated_delivery_date) {
            shipmentUpdateData.estimated_delivery = estimated_delivery_date;
        }

        if (actual_delivery_date) {
            shipmentUpdateData.actual_delivery = actual_delivery_date;
        }

        // Update the shipment status
        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/shipments?id=eq.${shipment_id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(shipmentUpdateData)
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            throw new Error(`Failed to update shipment: ${errorText}`);
        }

        const updatedShipment = await updateResponse.json();

        // Create tracking entry
        const trackingData = {
            shipment_id,
            status,
            location: location || 'QCS Cargo',
            notes: notes || `Status updated to ${status}`,
            timestamp: new Date().toISOString(),
            updated_by: userId
        };

        const trackingResponse = await fetch(`${supabaseUrl}/rest/v1/shipment_tracking`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(trackingData)
        });

        if (!trackingResponse.ok) {
            console.error('Failed to create tracking entry');
        }

        const trackingEntry = trackingResponse.ok ? await trackingResponse.json() : null;

        // Send notification to customer if status was updated by staff
        if (shipment.customer_id !== userId && ['delivered', 'out_for_delivery', 'exception'].includes(status)) {
            const notificationData = {
                user_id: shipment.customer_id,
                recipient_type: 'customer',
                title: 'Shipment Status Update',
                message: `Your shipment ${shipment_id.slice(0, 8)}... has been updated to ${status}`,
                reference_type: 'shipment',
                reference_id: shipment_id,
                priority: status === 'exception' ? 'high' : 'normal',
                created_at: new Date().toISOString()
            };

            const notificationResponse = await fetch(`${supabaseUrl}/rest/v1/notifications`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(notificationData)
            });

            if (!notificationResponse.ok) {
                console.error('Failed to create customer notification');
            }
        }

        // Return success response
        const result = {
            success: true,
            shipment: updatedShipment[0],
            tracking_entry: trackingEntry ? trackingEntry[0] : null,
            message: `Shipment status updated to ${status}`
        };

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Update shipment status error:', error);

        const errorResponse = {
            error: {
                code: 'SHIPMENT_UPDATE_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});