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

        // Parse query parameters for filtering and pagination
        const url = new URL(req.url);
        const status = url.searchParams.get('status');
        const shipmentId = url.searchParams.get('shipment_id');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const sortBy = url.searchParams.get('sort_by') || 'created_at';
        const sortOrder = url.searchParams.get('sort_order') || 'desc';

        // Build base query for shipments
        let shipmentsQuery = `customer_id=eq.${userId}`;
        
        if (status) {
            shipmentsQuery += `&status=eq.${status}`;
        }
        
        if (shipmentId) {
            shipmentsQuery += `&id=eq.${shipmentId}`;
        }

        // Fetch shipments with destination details
        const shipmentsResponse = await fetch(
            `${supabaseUrl}/rest/v1/shipments?${shipmentsQuery}&select=*,destinations!destination_id(id,country_name,city_name,rate_per_lb_201_plus,transit_days_min,transit_days_max)&limit=${limit}&offset=${offset}&order=${sortBy}.${sortOrder}`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!shipmentsResponse.ok) {
            const errorText = await shipmentsResponse.text();
            throw new Error(`Failed to fetch shipments: ${errorText}`);
        }

        const shipments = await shipmentsResponse.json();

        // For each shipment, fetch associated items, documents, and tracking
        const enrichedShipments = await Promise.all(shipments.map(async (shipment) => {
            const shipmentId = shipment.id;

            // Fetch shipment items
            const itemsResponse = await fetch(
                `${supabaseUrl}/rest/v1/shipment_items?shipment_id=eq.${shipmentId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            let items = [];
            if (itemsResponse.ok) {
                items = await itemsResponse.json();
            }

            // Fetch shipment documents
            const documentsResponse = await fetch(
                `${supabaseUrl}/rest/v1/shipment_documents?shipment_id=eq.${shipmentId}&order=upload_date.desc`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            let documents = [];
            if (documentsResponse.ok) {
                documents = await documentsResponse.json();
            }

            // Fetch shipment tracking (latest 10 entries)
            const trackingResponse = await fetch(
                `${supabaseUrl}/rest/v1/shipment_tracking?shipment_id=eq.${shipmentId}&order=timestamp.desc&limit=10`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            let tracking = [];
            if (trackingResponse.ok) {
                tracking = await trackingResponse.json();
            }

            // Get the latest tracking status
            const latestTracking = tracking.length > 0 ? tracking[0] : null;

            return {
                ...shipment,
                items,
                documents,
                tracking,
                latest_tracking: latestTracking,
                item_count: items.length,
                document_count: documents.length,
                // Calculate summary information
                total_items: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
                total_value: items.reduce((sum, item) => sum + (parseFloat(item.declared_value) || 0), 0)
            };
        }));

        // Get total count for pagination (if not filtering by specific shipment)
        let totalCount = enrichedShipments.length;
        if (!shipmentId) {
            const countResponse = await fetch(
                `${supabaseUrl}/rest/v1/shipments?${shipmentsQuery}&select=count`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Prefer': 'count=exact'
                    }
                }
            );

            if (countResponse.ok) {
                const countHeader = countResponse.headers.get('content-range');
                if (countHeader) {
                    totalCount = parseInt(countHeader.split('/')[1]);
                }
            }
        }

        // Return success response
        const result = {
            success: true,
            shipments: enrichedShipments,
            pagination: {
                total: totalCount,
                limit,
                offset,
                has_more: offset + limit < totalCount
            },
            filters: {
                status,
                shipment_id: shipmentId
            }
        };

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Get shipments error:', error);

        const errorResponse = {
            error: {
                code: 'FETCH_SHIPMENTS_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});