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
            customer_id,
            search_term,
            page = 1,
            limit = 20,
            include_analytics = false,
            include_bookings = false
        } = await req.json();

        console.log('Admin customer insights request:', { customer_id, search_term, page, limit, include_analytics, include_bookings });

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        let customers = [];
        let totalCount = 0;

        if (customer_id) {
            // Get specific customer with detailed analytics
            const customerResult = await getCustomerDetails(supabaseUrl, serviceRoleKey, customer_id);
            customers = customerResult ? [customerResult] : [];
            totalCount = customerResult ? 1 : 0;
        } else {
            // List customers with search functionality
            const results = await listCustomers(supabaseUrl, serviceRoleKey, {
                search_term,
                page,
                limit,
                include_analytics,
                include_bookings
            });
            customers = results.customers;
            totalCount = results.total;
        }

        const result = {
            success: true,
            data: {
                customers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                }
            }
        };

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Admin customer insights error:', error);

        const errorResponse = {
            error: {
                code: 'ADMIN_CUSTOMER_INSIGHTS_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Get detailed customer information with full analytics
async function getCustomerDetails(supabaseUrl: string, serviceRoleKey: string, customerId: string) {
    // Get customer profile
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${customerId}&select=*`, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    if (!profileResponse.ok) {
        throw new Error('Failed to fetch customer profile');
    }

    const profiles = await profileResponse.json();
    if (profiles.length === 0) {
        return null;
    }

    const profile = profiles[0];

    // Get customer bookings with full details
    const bookingsResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?customer_id=eq.${customerId}&select=*&order=created_at.desc`, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    let bookings = [];
    if (bookingsResponse.ok) {
        bookings = await bookingsResponse.json();
    }

    // Calculate comprehensive analytics
    const analytics = calculateCustomerAnalytics(bookings, profile);

    // Get customer behavioral patterns
    const behaviorPatterns = calculateBehaviorPatterns(bookings);

    // Get geographic distribution
    const geoDistribution = calculateGeographicDistribution(bookings);

    return {
        id: customerId,
        profile,
        bookings: bookings.slice(0, 10), // Last 10 bookings for details view
        analytics,
        behavior_patterns: behaviorPatterns,
        geographic_distribution: geoDistribution,
        summary: {
            total_bookings: bookings.length,
            profile_completion: profile.profile_completion_percentage || 0,
            customer_since: profile.created_at,
            last_booking: bookings.length > 0 ? bookings[0].created_at : null
        }
    };
}

// List customers with search and filtering
async function listCustomers(supabaseUrl: string, serviceRoleKey: string, options: any) {
    const { search_term, page, limit, include_analytics, include_bookings } = options;

    // Build query filters
    let query = 'select=*';
    let countQuery = 'select=count';
    const filters = [];

    if (search_term) {
        // Search in name, email, company, phone
        const searchFilter = `or=(first_name.ilike.*${search_term}*,last_name.ilike.*${search_term}*,email.ilike.*${search_term}*,company_name.ilike.*${search_term}*,phone.ilike.*${search_term}*,contact_person.ilike.*${search_term}*)`;
        filters.push(searchFilter);
    }

    if (filters.length > 0) {
        const filterString = filters.join('&');
        query += '&' + filterString;
        countQuery += '&' + filterString;
    }

    // Add pagination
    const offset = (page - 1) * limit;
    query += `&order=created_at.desc&limit=${limit}&offset=${offset}`;

    console.log('Executing customer query:', query);
    console.log('Executing count query:', countQuery);

    // Get customer profiles
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

    // Get total count
    const countResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?${countQuery}`, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Prefer': 'count=exact'
        }
    });

    let totalCount = 0;
    if (countResponse.ok) {
        const countHeader = countResponse.headers.get('content-range');
        if (countHeader) {
            const parts = countHeader.split('/');
            if (parts.length > 1) {
                totalCount = parseInt(parts[1]) || 0;
            }
        }
    }

    // Enrich customer data with analytics if requested
    const enrichedCustomers = await Promise.all(profiles.map(async (profile) => {
        let customerData = {
            id: profile.user_id,
            profile,
            summary: {
                profile_completion: profile.profile_completion_percentage || 0,
                customer_since: profile.created_at
            }
        };

        if (include_analytics || include_bookings) {
            // Get basic booking statistics for each customer
            const bookingsResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?customer_id=eq.${profile.user_id}&select=*&order=created_at.desc`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            let bookings = [];
            if (bookingsResponse.ok) {
                bookings = await bookingsResponse.json();
            }

            customerData.summary.total_bookings = bookings.length;
            customerData.summary.last_booking = bookings.length > 0 ? bookings[0].created_at : null;

            if (include_analytics) {
                customerData.analytics = calculateCustomerAnalytics(bookings, profile);
            }

            if (include_bookings) {
                customerData.recent_bookings = bookings.slice(0, 5); // Last 5 bookings
            }
        }

        return customerData;
    }));

    return {
        customers: enrichedCustomers,
        total: totalCount
    };
}

// Calculate comprehensive customer analytics
function calculateCustomerAnalytics(bookings: any[], profile: any) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Basic metrics
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed');
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled');
    const recentBookings = bookings.filter(b => new Date(b.created_at) >= thirtyDaysAgo);

    // Weight and service analysis
    const totalWeight = bookings.reduce((sum, b) => sum + (parseFloat(b.estimated_weight) || 0), 0);
    const avgWeight = totalBookings > 0 ? totalWeight / totalBookings : 0;

    // Service type preferences
    const serviceTypes = bookings.reduce((acc, b) => {
        const service = b.service_type || 'standard';
        acc[service] = (acc[service] || 0) + 1;
        return acc;
    }, {});
    const preferredService = Object.keys(serviceTypes).reduce((a, b) => serviceTypes[a] > serviceTypes[b] ? a : b, 'standard');

    // Booking frequency analysis
    let bookingFrequency = 'new';
    if (totalBookings > 1) {
        const daysSinceFirst = Math.floor((now.getTime() - new Date(bookings[bookings.length - 1].created_at).getTime()) / (1000 * 60 * 60 * 24));
        const avgDaysBetween = daysSinceFirst / (totalBookings - 1);
        
        if (avgDaysBetween <= 7) bookingFrequency = 'weekly';
        else if (avgDaysBetween <= 30) bookingFrequency = 'monthly';
        else if (avgDaysBetween <= 90) bookingFrequency = 'quarterly';
        else bookingFrequency = 'occasional';
    }

    // Risk assessment
    const cancellationRate = totalBookings > 0 ? (cancelledBookings.length / totalBookings) * 100 : 0;
    let riskScore = 0;
    if (cancellationRate > 30) riskScore += 40;
    else if (cancellationRate > 20) riskScore += 25;
    else if (cancellationRate > 10) riskScore += 15;
    
    // Profile completeness affects risk
    const completeness = profile.profile_completion_percentage || 0;
    if (completeness < 50) riskScore += 20;
    else if (completeness < 75) riskScore += 10;

    // Engagement score (inverse of risk for satisfied customers)
    const engagementScore = Math.max(0, 100 - riskScore + (recentBookings.length * 5));

    // Customer tier classification
    let customerTier = 'new';
    if (totalBookings >= 20 || totalWeight >= 1000) customerTier = 'vip';
    else if (totalBookings >= 10 || totalWeight >= 500) customerTier = 'premium';
    else if (totalBookings >= 3) customerTier = 'regular';

    return {
        total_bookings: totalBookings,
        confirmed_bookings: confirmedBookings.length,
        cancelled_bookings: cancelledBookings.length,
        recent_bookings_30d: recentBookings.length,
        total_weight_shipped: parseFloat(totalWeight.toFixed(2)),
        average_weight_per_booking: parseFloat(avgWeight.toFixed(2)),
        preferred_service_type: preferredService,
        service_type_distribution: serviceTypes,
        booking_frequency: bookingFrequency,
        cancellation_rate: parseFloat(cancellationRate.toFixed(1)),
        risk_score: Math.min(100, riskScore),
        engagement_score: Math.min(100, engagementScore),
        customer_tier: customerTier,
        profile_completion: completeness,
        days_since_last_booking: bookings.length > 0 ? Math.floor((now.getTime() - new Date(bookings[0].created_at).getTime()) / (1000 * 60 * 60 * 24)) : null
    };
}

// Calculate behavioral patterns
function calculateBehaviorPatterns(bookings: any[]) {
    if (bookings.length === 0) {
        return {
            peak_hours: {},
            peak_days: {},
            seasonal_patterns: {},
            service_evolution: []
        };
    }

    // Time patterns
    const hourPatterns = {};
    const dayPatterns = {};
    const monthPatterns = {};
    
    bookings.forEach(booking => {
        const date = new Date(booking.created_at);
        const hour = date.getHours();
        const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const month = date.getMonth(); // 0 = January, 1 = February, etc.
        
        hourPatterns[hour] = (hourPatterns[hour] || 0) + 1;
        dayPatterns[day] = (dayPatterns[day] || 0) + 1;
        monthPatterns[month] = (monthPatterns[month] || 0) + 1;
    });

    // Service evolution over time
    const serviceEvolution = bookings.slice(-12).map((booking, index) => ({
        booking_number: bookings.length - 12 + index + 1,
        service_type: booking.service_type,
        date: booking.created_at,
        weight: parseFloat(booking.estimated_weight) || 0
    }));

    return {
        peak_hours: hourPatterns,
        peak_days: dayPatterns,
        seasonal_patterns: monthPatterns,
        service_evolution: serviceEvolution
    };
}

// Calculate geographic distribution
function calculateGeographicDistribution(bookings: any[]) {
    const zipCounts = {};
    const stateCounts = {};
    const cityCounts = {};
    
    bookings.forEach(booking => {
        if (booking.address) {
            const address = typeof booking.address === 'string' ? JSON.parse(booking.address) : booking.address;
            
            if (address.zip_code) {
                zipCounts[address.zip_code] = (zipCounts[address.zip_code] || 0) + 1;
            }
            if (address.state) {
                stateCounts[address.state] = (stateCounts[address.state] || 0) + 1;
            }
            if (address.city) {
                cityCounts[address.city] = (cityCounts[address.city] || 0) + 1;
            }
        }
        
        // Also check zip_code field directly on booking
        if (booking.zip_code) {
            zipCounts[booking.zip_code] = (zipCounts[booking.zip_code] || 0) + 1;
        }
    });

    // Get top locations
    const topZips = Object.entries(zipCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([zip, count]) => ({ zip_code: zip, booking_count: count }));
        
    const topStates = Object.entries(stateCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([state, count]) => ({ state, booking_count: count }));
        
    const topCities = Object.entries(cityCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([city, count]) => ({ city, booking_count: count }));

    return {
        by_zip_code: zipCounts,
        by_state: stateCounts,
        by_city: cityCounts,
        top_zip_codes: topZips,
        top_states: topStates,
        top_cities: topCities
    };
}