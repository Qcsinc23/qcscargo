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

        // Verify user has admin/staff permissions
        const profileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${userId}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (!profileResponse.ok) {
            throw new Error('Failed to verify user permissions');
        }

        const profiles = await profileResponse.json();
        if (profiles.length === 0 || !['admin', 'staff', 'manager'].includes(profiles[0].role)) {
            throw new Error('Access denied: insufficient permissions');
        }

        // Parse query parameters
        const url = new URL(req.url);
        const customerId = url.searchParams.get('customer_id');
        const search = url.searchParams.get('search'); // Search by name or email
        const status = url.searchParams.get('status');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const sortBy = url.searchParams.get('sort_by') || 'created_at';
        const sortOrder = url.searchParams.get('sort_order') || 'desc';

        let customers = [];
        let totalCount = 0;

        if (customerId) {
            // Fetch specific customer with detailed information
            const customerResponse = await fetch(
                `${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${customerId}&select=*`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            if (!customerResponse.ok) {
                throw new Error('Failed to fetch customer data');
            }

            const customerData = await customerResponse.json();
            if (customerData.length === 0) {
                throw new Error('Customer not found');
            }

            const customer = customerData[0];

            // Get customer's shipments summary
            const shipmentsResponse = await fetch(
                `${supabaseUrl}/rest/v1/shipments?customer_id=eq.${customerId}&select=id,status,created_at,total_weight,estimated_cost`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            let shipments = [];
            if (shipmentsResponse.ok) {
                shipments = await shipmentsResponse.json();
            }

            // Calculate customer statistics
            const totalShipments = shipments.length;
            const totalSpent = shipments.reduce((sum, s) => sum + (parseFloat(s.estimated_cost) || 0), 0);
            const recentShipments = shipments.filter(s => {
                const shipmentDate = new Date(s.created_at);
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                return shipmentDate >= thirtyDaysAgo;
            }).length;

            const statusCounts = shipments.reduce((counts, s) => {
                counts[s.status] = (counts[s.status] || 0) + 1;
                return counts;
            }, {});

            customers = [{
                ...customer,
                shipments,
                statistics: {
                    total_shipments: totalShipments,
                    total_spent: totalSpent,
                    recent_shipments_30_days: recentShipments,
                    status_breakdown: statusCounts,
                    average_shipment_value: totalShipments > 0 ? totalSpent / totalShipments : 0
                }
            }];

            totalCount = 1;
        } else {
            // Fetch multiple customers with optional filtering
            let query = 'select=*';
            let whereConditions = [];

            if (search) {
                whereConditions.push(`or=(first_name.ilike.*${search}*,last_name.ilike.*${search}*,email.ilike.*${search}*)`);
            }

            if (status) {
                whereConditions.push(`status=eq.${status}`);
            }

            const whereClause = whereConditions.length > 0 ? '&' + whereConditions.join('&') : '';

            const customersResponse = await fetch(
                `${supabaseUrl}/rest/v1/user_profiles?${query}${whereClause}&limit=${limit}&offset=${offset}&order=${sortBy}.${sortOrder}`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            if (!customersResponse.ok) {
                const errorText = await customersResponse.text();
                throw new Error(`Failed to fetch customers: ${errorText}`);
            }

            customers = await customersResponse.json();

            // Get total count for pagination
            const countResponse = await fetch(
                `${supabaseUrl}/rest/v1/user_profiles?select=count${whereClause}`,
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

            // For each customer, get basic shipment statistics
            const enrichedCustomers = await Promise.all(customers.map(async (customer) => {
                const customerShipmentsResponse = await fetch(
                    `${supabaseUrl}/rest/v1/shipments?customer_id=eq.${customer.user_id}&select=status,estimated_cost,created_at`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );

                let customerShipments = [];
                if (customerShipmentsResponse.ok) {
                    customerShipments = await customerShipmentsResponse.json();
                }

                const totalShipments = customerShipments.length;
                const totalSpent = customerShipments.reduce((sum, s) => sum + (parseFloat(s.estimated_cost) || 0), 0);
                const lastShipmentDate = customerShipments.length > 0 ? 
                    Math.max(...customerShipments.map(s => new Date(s.created_at).getTime())) : null;

                return {
                    ...customer,
                    statistics: {
                        total_shipments: totalShipments,
                        total_spent: totalSpent,
                        last_shipment_date: lastShipmentDate ? new Date(lastShipmentDate).toISOString() : null
                    }
                };
            }));

            customers = enrichedCustomers;
        }

        // Return success response
        const result = {
            success: true,
            customers,
            pagination: {
                total: totalCount,
                limit,
                offset,
                has_more: offset + limit < totalCount
            },
            filters: {
                customer_id: customerId,
                search,
                status
            }
        };

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Get customer data error:', error);

        const errorResponse = {
            error: {
                code: 'FETCH_CUSTOMER_DATA_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});