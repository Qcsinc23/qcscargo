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

        // Get user from auth header and verify admin role
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

        // Check if user is admin
        const adminCheckResponse = await fetch(
            `${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${userId}&role=eq.admin&select=role`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );

        if (!adminCheckResponse.ok) {
            throw new Error('Failed to verify admin status');
        }

        const adminData = await adminCheckResponse.json();
        if (!adminData || adminData.length === 0) {
            throw new Error('Access denied: Admin role required');
        }

        // Parse request data and query parameters
        const url = new URL(req.url);
        const requestMethod = req.method;
        const requestData = requestMethod === 'POST' || requestMethod === 'PUT' ? await req.json() : {};

        // Handle different actions
        const action = url.searchParams.get('action') || requestData.action || 'list';

        console.log('Admin shipments management action:', action);

        switch (action) {
            case 'list':
                return await handleListShipments(supabaseUrl, serviceRoleKey, url);
            
            case 'get':
                return await handleGetShipment(supabaseUrl, serviceRoleKey, requestData.shipment_id);
            
            case 'update_status':
                return await handleUpdateStatus(supabaseUrl, serviceRoleKey, requestData, userId);
            
            case 'add_tracking':
                return await handleAddTracking(supabaseUrl, serviceRoleKey, requestData, userId);
            
            case 'stats':
                return await handleGetStats(supabaseUrl, serviceRoleKey);
            
            default:
                throw new Error(`Unknown action: ${action}`);
        }

    } catch (error) {
        console.error('Admin shipments management error:', error);

        const errorResponse = {
            error: {
                code: 'ADMIN_SHIPMENTS_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Handle listing all shipments with filtering and pagination
async function handleListShipments(supabaseUrl: string, serviceRoleKey: string, url: URL) {
    const status = url.searchParams.get('status');
    const customerId = url.searchParams.get('customer_id');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const sortBy = url.searchParams.get('sort_by') || 'created_at';
    const sortOrder = url.searchParams.get('sort_order') || 'desc';
    const search = url.searchParams.get('search'); // Search by tracking number or customer

    // Build query filters
    let filters = [];
    if (status) filters.push(`status=eq.${status}`);
    if (customerId) filters.push(`customer_id=eq.${customerId}`);
    
    const filterQuery = filters.length > 0 ? `&${filters.join('&')}` : '';

    // Fetch shipments with customer and destination details
    const shipmentsResponse = await fetch(
        `${supabaseUrl}/rest/v1/shipments?select=*,user_profiles!customer_id(first_name,last_name,company_name,email),destinations!destination_id(country_name,city_name)${filterQuery}&limit=${limit}&offset=${offset}&order=${sortBy}.${sortOrder}`,
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

    // Enrich each shipment with items count and latest tracking
    const enrichedShipments = await Promise.all(shipments.map(async (shipment: any) => {
        // Get items count
        const itemsCountResponse = await fetch(
            `${supabaseUrl}/rest/v1/shipment_items?shipment_id=eq.${shipment.id}&select=count`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Prefer': 'count=exact'
                }
            }
        );

        let itemsCount = 0;
        if (itemsCountResponse.ok) {
            const countHeader = itemsCountResponse.headers.get('content-range');
            if (countHeader) {
                itemsCount = parseInt(countHeader.split('/')[1]);
            }
        }

        // Get latest tracking
        const trackingResponse = await fetch(
            `${supabaseUrl}/rest/v1/shipment_tracking?shipment_id=eq.${shipment.id}&order=timestamp.desc&limit=1`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );

        let latestTracking = null;
        if (trackingResponse.ok) {
            const tracking = await trackingResponse.json();
            latestTracking = tracking.length > 0 ? tracking[0] : null;
        }

        return {
            ...shipment,
            items_count: itemsCount,
            latest_tracking: latestTracking,
            customer: shipment.user_profiles,
            destination: shipment.destinations
        };
    }));

    // Get total count for pagination
    const countResponse = await fetch(
        `${supabaseUrl}/rest/v1/shipments?select=count${filterQuery}`,
        {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Prefer': 'count=exact'
            }
        }
    );

    let totalCount = enrichedShipments.length;
    if (countResponse.ok) {
        const countHeader = countResponse.headers.get('content-range');
        if (countHeader) {
            totalCount = parseInt(countHeader.split('/')[1]);
        }
    }

    const result = {
        success: true,
        shipments: enrichedShipments,
        pagination: {
            total: totalCount,
            limit,
            offset,
            has_more: offset + limit < totalCount
        },
        filters: { status, customer_id: customerId }
    };

    return new Response(JSON.stringify({ data: result }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

// Handle getting a specific shipment with full details
async function handleGetShipment(supabaseUrl: string, serviceRoleKey: string, shipmentId: string) {
    if (!shipmentId) {
        throw new Error('Shipment ID is required');
    }

    // Get shipment with all related data
    const shipmentResponse = await fetch(
        `${supabaseUrl}/rest/v1/shipments?id=eq.${shipmentId}&select=*,user_profiles!customer_id(*),destinations!destination_id(*)`,
        {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        }
    );

    if (!shipmentResponse.ok) {
        throw new Error('Failed to fetch shipment');
    }

    const shipmentData = await shipmentResponse.json();
    if (shipmentData.length === 0) {
        throw new Error('Shipment not found');
    }

    const shipment = shipmentData[0];

    // Get items
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

    // Get tracking history
    const trackingResponse = await fetch(
        `${supabaseUrl}/rest/v1/shipment_tracking?shipment_id=eq.${shipmentId}&order=timestamp.desc`,
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

    const result = {
        success: true,
        shipment: {
            ...shipment,
            items,
            tracking,
            customer: shipment.user_profiles,
            destination: shipment.destinations
        }
    };

    return new Response(JSON.stringify({ data: result }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

// Handle updating shipment status
async function handleUpdateStatus(supabaseUrl: string, serviceRoleKey: string, requestData: any, userId: string) {
    const { shipment_id, status, notes } = requestData;

    if (!shipment_id || !status) {
        throw new Error('Shipment ID and status are required');
    }

    // Update shipment status
    const updateResponse = await fetch(
        `${supabaseUrl}/rest/v1/shipments?id=eq.${shipment_id}`,
        {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({ status, updated_at: new Date().toISOString() })
        }
    );

    if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Failed to update shipment: ${errorText}`);
    }

    // Add tracking entry
    const trackingData = {
        shipment_id: parseInt(shipment_id),
        status,
        location: 'QCS Cargo Facility',
        notes: notes || `Status updated to ${status}`,
        timestamp: new Date().toISOString(),
        created_by: userId
    };

    await fetch(
        `${supabaseUrl}/rest/v1/shipment_tracking`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(trackingData)
        }
    );

    const result = {
        success: true,
        message: 'Shipment status updated successfully'
    };

    return new Response(JSON.stringify({ data: result }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

// Handle adding tracking entry
async function handleAddTracking(supabaseUrl: string, serviceRoleKey: string, requestData: any, userId: string) {
    const { shipment_id, status, location, notes } = requestData;

    if (!shipment_id || !status) {
        throw new Error('Shipment ID and status are required');
    }

    const trackingData = {
        shipment_id: parseInt(shipment_id),
        status,
        location: location || 'QCS Cargo Facility',
        notes: notes || '',
        timestamp: new Date().toISOString(),
        created_by: userId
    };

    const trackingResponse = await fetch(
        `${supabaseUrl}/rest/v1/shipment_tracking`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(trackingData)
        }
    );

    if (!trackingResponse.ok) {
        const errorText = await trackingResponse.text();
        throw new Error(`Failed to add tracking: ${errorText}`);
    }

    const result = {
        success: true,
        message: 'Tracking entry added successfully'
    };

    return new Response(JSON.stringify({ data: result }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

// Handle getting shipment statistics
async function handleGetStats(supabaseUrl: string, serviceRoleKey: string) {
    // Get overall shipment counts by status
    const statusStatsResponse = await fetch(
        `${supabaseUrl}/rest/v1/shipments?select=status&order=status`,
        {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        }
    );

    let statusStats = {};
    if (statusStatsResponse.ok) {
        const shipments = await statusStatsResponse.json();
        statusStats = shipments.reduce((acc: any, shipment: any) => {
            acc[shipment.status] = (acc[shipment.status] || 0) + 1;
            return acc;
        }, {});
    }

    // Get recent shipments count (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentResponse = await fetch(
        `${supabaseUrl}/rest/v1/shipments?created_at=gte.${sevenDaysAgo.toISOString()}&select=count`,
        {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Prefer': 'count=exact'
            }
        }
    );

    let recentCount = 0;
    if (recentResponse.ok) {
        const countHeader = recentResponse.headers.get('content-range');
        if (countHeader) {
            recentCount = parseInt(countHeader.split('/')[1]);
        }
    }

    const result = {
        success: true,
        stats: {
            status_breakdown: statusStats,
            recent_shipments_7_days: recentCount,
            total_shipments: Object.values(statusStats).reduce((a: any, b: any) => a + b, 0)
        }
    };

    return new Response(JSON.stringify({ data: result }), {
        headers: { 'Content-Type': 'application/json' }
    });
}