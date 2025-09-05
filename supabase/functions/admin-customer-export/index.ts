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
            export_type = 'customer_list', // 'customer_list', 'customer_analytics', 'customer_bookings'
            format = 'csv', // 'csv', 'json'
            customer_ids = [], // Specific customers to export, empty = all
            include_analytics = true,
            include_bookings = false,
            date_range = null, // { start: '2024-01-01', end: '2024-12-31' }
            filters = {}
        } = await req.json();

        console.log('Admin customer export request:', { export_type, format, customer_ids, include_analytics, include_bookings });

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        let exportData;
        let filename;

        switch (export_type) {
            case 'customer_list':
                exportData = await exportCustomerList(supabaseUrl, serviceRoleKey, {
                    customer_ids,
                    include_analytics,
                    include_bookings,
                    date_range,
                    filters
                });
                filename = `customer_list_${new Date().toISOString().split('T')[0]}`;
                break;
                
            case 'customer_analytics':
                exportData = await exportCustomerAnalytics(supabaseUrl, serviceRoleKey, {
                    customer_ids,
                    date_range,
                    filters
                });
                filename = `customer_analytics_${new Date().toISOString().split('T')[0]}`;
                break;
                
            case 'customer_bookings':
                exportData = await exportCustomerBookings(supabaseUrl, serviceRoleKey, {
                    customer_ids,
                    date_range,
                    filters
                });
                filename = `customer_bookings_${new Date().toISOString().split('T')[0]}`;
                break;
                
            default:
                throw new Error(`Unknown export type: ${export_type}`);
        }

        // Format the response based on requested format
        if (format === 'csv') {
            const csvContent = convertToCSV(exportData, export_type);
            
            return new Response(csvContent, {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${filename}.csv"`
                }
            });
        } else {
            // JSON format
            return new Response(JSON.stringify({
                success: true,
                data: exportData,
                export_info: {
                    export_type,
                    format,
                    generated_at: new Date().toISOString(),
                    record_count: Array.isArray(exportData) ? exportData.length : Object.keys(exportData).length
                }
            }, null, 2), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${filename}.json"`
                }
            });
        }

    } catch (error) {
        console.error('Admin customer export error:', error);

        const errorResponse = {
            error: {
                code: 'ADMIN_CUSTOMER_EXPORT_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Export customer list with profiles and basic analytics
async function exportCustomerList(supabaseUrl: string, serviceRoleKey: string, options: any) {
    const { customer_ids, include_analytics, include_bookings, date_range, filters } = options;
    
    // Build query for customer profiles
    let query = 'select=*';
    const queryFilters = [];

    if (customer_ids && customer_ids.length > 0) {
        queryFilters.push(`user_id=in.(${customer_ids.join(',')})`);  
    }

    if (filters.search_term) {
        const searchFilter = `or=(first_name.ilike.*${filters.search_term}*,last_name.ilike.*${filters.search_term}*,email.ilike.*${filters.search_term}*,company_name.ilike.*${filters.search_term}*)`;
        queryFilters.push(searchFilter);
    }

    if (queryFilters.length > 0) {
        query += '&' + queryFilters.join('&');
    }

    query += '&order=created_at.desc&limit=1000'; // Reasonable limit for export

    console.log('Fetching customer profiles with query:', query);

    const profilesResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?${query}`, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    if (!profilesResponse.ok) {
        const errorText = await profilesResponse.text();
        throw new Error(`Failed to fetch customer profiles: ${errorText}`);
    }

    const profiles = await profilesResponse.json();
    console.log(`Found ${profiles.length} customer profiles`);

    // Enrich with booking data if requested
    const enrichedCustomers = await Promise.all(profiles.map(async (profile) => {
        let customerData = {
            customer_id: profile.user_id,
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            email: profile.email || '',
            phone: profile.phone || '',
            phone_country_code: profile.phone_country_code || '',
            company_name: profile.company_name || '',
            contact_person: profile.contact_person || '',
            address_line1: profile.address_line1 || '',
            address_line2: profile.address_line2 || '',
            city: profile.city || '',
            state: profile.state || '',
            zip_code: profile.zip_code || '',
            country: profile.country || '',
            region: profile.region || '',
            district: profile.district || '',
            business_type: profile.business_type || '',
            tax_id: profile.tax_id || '',
            preferred_contact_method: profile.preferred_contact_method || '',
            profile_completion_percentage: profile.profile_completion_percentage || 0,
            customer_since: profile.created_at,
            last_profile_update: profile.profile_updated_at,
            emergency_contact: profile.emergency_contact || '',
            emergency_phone: profile.emergency_phone || ''
        };

        if (include_analytics || include_bookings) {
            // Get customer bookings
            let bookingsQuery = `customer_id=eq.${profile.user_id}&select=*&order=created_at.desc`;
            
            if (date_range && date_range.start && date_range.end) {
                bookingsQuery += `&created_at=gte.${date_range.start}&created_at=lte.${date_range.end}`;
            }

            const bookingsResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?${bookingsQuery}`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            let bookings = [];
            if (bookingsResponse.ok) {
                bookings = await bookingsResponse.json();
            }

            if (include_analytics) {
                const analytics = calculateCustomerAnalyticsForExport(bookings);
                Object.assign(customerData, analytics);
            }

            if (include_bookings) {
                customerData.total_bookings = bookings.length;
                customerData.last_booking_date = bookings.length > 0 ? bookings[0].created_at : null;
                customerData.first_booking_date = bookings.length > 0 ? bookings[bookings.length - 1].created_at : null;
            }
        }

        return customerData;
    }));

    return enrichedCustomers;
}

// Export detailed customer analytics
async function exportCustomerAnalytics(supabaseUrl: string, serviceRoleKey: string, options: any) {
    const customerListData = await exportCustomerList(supabaseUrl, serviceRoleKey, {
        ...options,
        include_analytics: true,
        include_bookings: true
    });

    // Add additional analytics calculations
    return customerListData.map(customer => {
        // Calculate additional derived metrics
        const daysSinceLastBooking = customer.last_booking_date ? 
            Math.floor((new Date().getTime() - new Date(customer.last_booking_date).getTime()) / (1000 * 60 * 60 * 24)) : null;
        
        const daysSinceRegistration = customer.customer_since ? 
            Math.floor((new Date().getTime() - new Date(customer.customer_since).getTime()) / (1000 * 60 * 60 * 24)) : null;

        return {
            ...customer,
            days_since_last_booking: daysSinceLastBooking,
            days_since_registration: daysSinceRegistration,
            avg_bookings_per_month: daysSinceRegistration > 0 ? 
                ((customer.total_bookings || 0) / daysSinceRegistration * 30).toFixed(2) : '0'
        };
    });
}

// Export customer bookings data
async function exportCustomerBookings(supabaseUrl: string, serviceRoleKey: string, options: any) {
    const { customer_ids, date_range, filters } = options;
    
    let query = 'select=*';
    const queryFilters = [];

    if (customer_ids && customer_ids.length > 0) {
        queryFilters.push(`customer_id=in.(${customer_ids.join(',')})`);
    }

    if (date_range && date_range.start && date_range.end) {
        queryFilters.push(`created_at=gte.${date_range.start}`);
        queryFilters.push(`created_at=lte.${date_range.end}`);
    }

    if (filters.status) {
        queryFilters.push(`status=eq.${filters.status}`);
    }

    if (queryFilters.length > 0) {
        query += '&' + queryFilters.join('&');
    }

    query += '&order=created_at.desc&limit=5000'; // Large limit for comprehensive export

    console.log('Fetching bookings with query:', query);

    const bookingsResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?${query}`, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    if (!bookingsResponse.ok) {
        const errorText = await bookingsResponse.text();
        throw new Error(`Failed to fetch bookings: ${errorText}`);
    }

    const bookings = await bookingsResponse.json();
    console.log(`Found ${bookings.length} bookings`);

    // Get customer profiles for the bookings
    const customerIds = [...new Set(bookings.map(b => b.customer_id))];
    const profilesResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?user_id=in.(${customerIds.join(',')})&select=user_id,first_name,last_name,email,company_name`, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    let profiles = [];
    if (profilesResponse.ok) {
        profiles = await profilesResponse.json();
    }

    // Enrich bookings with customer information
    const enrichedBookings = bookings.map(booking => {
        const customerProfile = profiles.find(p => p.user_id === booking.customer_id);
        const address = typeof booking.address === 'string' ? JSON.parse(booking.address) : booking.address;
        
        return {
            booking_id: booking.id,
            customer_id: booking.customer_id,
            customer_name: customerProfile ? `${customerProfile.first_name} ${customerProfile.last_name}`.trim() : '',
            customer_email: customerProfile?.email || '',
            customer_company: customerProfile?.company_name || '',
            booking_date: booking.created_at,
            window_start: booking.window_start,
            window_end: booking.window_end,
            pickup_or_drop: booking.pickup_or_drop,
            status: booking.status,
            service_type: booking.service_type,
            estimated_weight: booking.estimated_weight || 0,
            address_street: address?.street || '',
            address_city: address?.city || '',
            address_state: address?.state || '',
            address_zip: address?.zip_code || booking.zip_code || '',
            distance_miles: booking.distance_miles || 0,
            assigned_vehicle_id: booking.assigned_vehicle_id || '',
            notes: booking.notes || '',
            updated_at: booking.updated_at
        };
    });

    return enrichedBookings;
}

// Calculate analytics specifically for export format
function calculateCustomerAnalyticsForExport(bookings: any[]) {
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length;
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
    
    const totalWeight = bookings.reduce((sum, b) => sum + (parseFloat(b.estimated_weight) || 0), 0);
    const avgWeight = totalBookings > 0 ? totalWeight / totalBookings : 0;
    
    const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;
    
    // Service type analysis
    const serviceTypes = bookings.reduce((acc, b) => {
        const service = b.service_type || 'standard';
        acc[service] = (acc[service] || 0) + 1;
        return acc;
    }, {});
    const preferredService = Object.keys(serviceTypes).reduce((a, b) => serviceTypes[a] > serviceTypes[b] ? a : b, 'standard');
    
    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentBookings = bookings.filter(b => new Date(b.created_at) >= thirtyDaysAgo).length;
    
    return {
        total_bookings: totalBookings,
        confirmed_bookings: confirmedBookings,
        cancelled_bookings: cancelledBookings,
        pending_bookings: pendingBookings,
        cancellation_rate: parseFloat(cancellationRate.toFixed(2)),
        total_weight_shipped: parseFloat(totalWeight.toFixed(2)),
        average_weight_per_booking: parseFloat(avgWeight.toFixed(2)),
        preferred_service_type: preferredService,
        standard_service_count: serviceTypes.standard || 0,
        express_service_count: serviceTypes.express || 0,
        recent_bookings_30d: recentBookings
    };
}

// Convert data to CSV format
function convertToCSV(data: any[], exportType: string): string {
    if (!data || data.length === 0) {
        return 'No data available for export';
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    const csvRows = [];
    
    // Add header row
    csvRows.push(headers.map(header => `"${header}"`).join(','));
    
    // Add data rows
    data.forEach(row => {
        const csvRow = headers.map(header => {
            let value = row[header];
            
            // Handle null/undefined values
            if (value === null || value === undefined) {
                value = '';
            }
            
            // Handle objects/arrays - convert to JSON string
            if (typeof value === 'object') {
                value = JSON.stringify(value);
            }
            
            // Escape quotes and wrap in quotes
            value = String(value).replace(/"/g, '""');
            return `"${value}"`;
        });
        
        csvRows.push(csvRow.join(','));
    });
    
    return csvRows.join('\n');
}