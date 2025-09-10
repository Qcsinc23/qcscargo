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
            page = 1, 
            limit = 25,
            status,
            dateRange,
            customerId,
            vehicleId,
            serviceType,
            priorityLevel,
            searchTerm
        } = await req.json();

        console.log('Admin list bookings request:', { page, limit, status, dateRange, customerId, vehicleId, serviceType, priorityLevel, searchTerm });

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Build query filters
        let query = 'select=*';
        let countQuery = 'select=count';
        const filters = [];

        // Apply filters
        if (status && status.length > 0) {
            const statusFilter = Array.isArray(status) ? `in.(${status.join(',')})` : `eq.${status}`;
            filters.push(`status=${statusFilter}`);
        }

        if (dateRange && dateRange.start && dateRange.end) {
            filters.push(`window_start=gte.${dateRange.start}`);
            filters.push(`window_end=lte.${dateRange.end}`);
        }

        if (customerId) {
            filters.push(`customer_id=eq.${customerId}`);
        }

        if (vehicleId) {
            filters.push(`assigned_vehicle_id=eq.${vehicleId}`);
        }

        if (serviceType) {
            filters.push(`service_type=eq.${serviceType}`);
        }

        if (priorityLevel) {
            filters.push(`priority_level=eq.${priorityLevel}`);
        }

        // Add search functionality
        if (searchTerm) {
            // Search in address fields, notes, and customer email
            const searchFilter = `or=(address->>street.ilike.*${searchTerm}*,address->>city.ilike.*${searchTerm}*,address->>zip_code.ilike.*${searchTerm}*,notes.ilike.*${searchTerm}*,internal_notes.ilike.*${searchTerm}*)`;
            filters.push(searchFilter);
        }

        // Add filters to query
        if (filters.length > 0) {
            query += '&' + filters.join('&');
            countQuery += '&' + filters.join('&');
        }

        // Add pagination
        const offset = (page - 1) * limit;
        query += `&order=created_at.desc&limit=${limit}&offset=${offset}`;

        console.log('Executing query:', query);
        console.log('Executing count query:', countQuery);

        // Get bookings data
        const bookingsResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?${query}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!bookingsResponse.ok) {
            const errorText = await bookingsResponse.text();
            console.error('Failed to fetch bookings:', errorText);
            throw new Error('Failed to fetch bookings data');
        }

        const bookingsData = await bookingsResponse.json();

        // Get total count
        const countResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?${countQuery}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        let totalCount = 0;
        if (countResponse.ok) {
            const countData = await countResponse.json();
            totalCount = countData[0]?.count || 0;
        }

        // Enhance booking data with calculated fields
        const enhancedBookings = bookingsData.map(booking => {
            // Calculate time until booking
            const bookingTime = new Date(booking.window_start);
            const now = new Date();
            const hoursUntil = Math.round((bookingTime - now) / (1000 * 60 * 60));

            // Calculate priority score based on multiple factors
            let priorityScore = 0;
            if (booking.priority_level === 'urgent') priorityScore += 10;
            else if (booking.priority_level === 'express') priorityScore += 5;
            
            if (hoursUntil < 24) priorityScore += 3;
            else if (hoursUntil < 48) priorityScore += 1;
            
            if (booking.service_type === 'express') priorityScore += 2;

            return {
                ...booking,
                hours_until_booking: hoursUntil,
                priority_score: priorityScore,
                customer_email: 'Available via lookup' // Placeholder for now
            };
        });

        // Calculate summary statistics
        const statusCounts = enhancedBookings.reduce((acc, booking) => {
            acc[booking.status] = (acc[booking.status] || 0) + 1;
            return acc;
        }, {});

        const result = {
            data: {
                bookings: enhancedBookings,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                },
                summary: {
                    total_bookings: totalCount,
                    status_counts: statusCounts
                },
                filters_applied: {
                    status,
                    dateRange,
                    customerId,
                    vehicleId,
                    serviceType,
                    priorityLevel,
                    searchTerm
                }
            }
        };

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Admin list bookings error:', error);

        const errorResponse = {
            error: {
                code: 'ADMIN_LIST_BOOKINGS_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});