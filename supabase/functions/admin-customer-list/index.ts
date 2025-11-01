import { verifyAdminAccess, corsHeaders, handleOptions, createErrorResponse, createSuccessResponse, logAdminAction } from '../_shared/auth-utils.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return handleOptions();
    }

    try {
        // Get environment variables
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            return createErrorResponse('CONFIG_ERROR', 'Supabase configuration missing', 500);
        }

        // CRITICAL SECURITY FIX: Verify admin authentication
        const authHeader = req.headers.get('authorization');
        const authResult = await verifyAdminAccess(authHeader, supabaseUrl, serviceRoleKey);

        if (!authResult.success) {
            return createErrorResponse('UNAUTHORIZED', authResult.error || 'Admin access required', 401);
        }

        // Log admin action for audit trail
        logAdminAction('CUSTOMER_LIST_ACCESS', authResult.user!, {
            method: req.method,
            url: req.url
        });

        console.log(`Admin customer list access granted to: ${authResult.user!.email}`);

        const {
            search_term = '',
            page = 1,
            limit = 25,
            sort_by = 'created_at',
            sort_order = 'desc',
            filters = {}
        } = await req.json();

        console.log('Admin customer list request:', {
            admin: authResult.user!.email,
            search_term,
            page,
            limit,
            sort_by,
            sort_order,
            filters
        });

        // Build query for customer profiles with search and filters
        let query = 'select=*';
        let countQuery = 'select=count';
        const queryFilters: string[] = [];

        // Search functionality
        if (search_term && search_term.trim().length > 0) {
            const term = search_term.trim();
            const searchFilter = `or=(first_name.ilike.*${term}*,last_name.ilike.*${term}*,email.ilike.*${term}*,company_name.ilike.*${term}*,phone.ilike.*${term}*,contact_person.ilike.*${term}*)`;
            queryFilters.push(searchFilter);
        }

        // Additional filters
        if (filters.country) {
            queryFilters.push(`country=eq.${filters.country}`);
        }
        if (filters.state) {
            queryFilters.push(`state=eq.${filters.state}`);
        }
        if (filters.business_type) {
            queryFilters.push(`business_type=eq.${filters.business_type}`);
        }
        if (filters.min_profile_completion) {
            queryFilters.push(`profile_completion_percentage=gte.${filters.min_profile_completion}`);
        }

        // Apply filters to both queries
        if (queryFilters.length > 0) {
            const filterString = queryFilters.join('&');
            query += '&' + filterString;
            countQuery += '&' + filterString;
        }

        // Add sorting and pagination to main query
        const validSortColumns = ['created_at', 'first_name', 'last_name', 'email', 'company_name', 'profile_completion_percentage'];
        const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
        const sortDirection = sort_order === 'asc' ? 'asc' : 'desc';
        
        const offset = (page - 1) * limit;
        query += `&order=${sortColumn}.${sortDirection}&limit=${limit}&offset=${offset}`;

        console.log('Executing customer query:', query);
        console.log('Executing count query:', countQuery);

        // Execute both queries in parallel
        const [profilesResponse, countResponse] = await Promise.all([
            fetch(`${supabaseUrl}/rest/v1/user_profiles?${query}`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }),
            fetch(`${supabaseUrl}/rest/v1/user_profiles?${countQuery}`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Prefer': 'count=exact'
                }
            })
        ]);

        if (!profilesResponse.ok) {
            const errorText = await profilesResponse.text();
            throw new Error(`Failed to fetch customer profiles: ${errorText}`);
        }

        const profiles = await profilesResponse.json();

        // Extract total count from response header or response body
        let totalCount = 0;
        if (countResponse.ok) {
            const countHeader = countResponse.headers.get('content-range');
            if (countHeader) {
                const parts = countHeader.split('/');
                if (parts.length > 1) {
                    totalCount = parseInt(parts[1]) || 0;
                }
            } else {
                // Fallback: try to parse count from response body
                try {
                    const countData = await countResponse.json();
                    totalCount = countData[0]?.count || 0;
                } catch (e) {
                    console.log('Could not parse count response, using profiles length');
                    totalCount = profiles.length;
                }
            }
        }

        console.log(`Found ${profiles.length} profiles out of ${totalCount} total`);

        // Enrich customer profiles with real-time statistics
        const customerIds = profiles.map(p => p.user_id);
        let bookingStats = {};
        let shipmentStats = {};

        if (customerIds.length > 0) {
            // Get booking counts for each customer (REAL-TIME)
            const [bookingStatsResponse, shipmentStatsResponse] = await Promise.all([
                fetch(
                    `${supabaseUrl}/rest/v1/bookings?customer_id=in.(${customerIds.join(',')})&select=customer_id,status,created_at,estimated_weight`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }),
                fetch(
                    `${supabaseUrl}/rest/v1/shipments?customer_id=in.(${customerIds.join(',')})&select=customer_id,status,created_at,total_weight`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                })
            ]);

            if (bookingStatsResponse.ok) {
                const allBookings = await bookingStatsResponse.json();
                
                // Calculate stats per customer
                bookingStats = allBookings.reduce((acc, booking) => {
                    const customerId = booking.customer_id;
                    if (!acc[customerId]) {
                        acc[customerId] = {
                            total: 0,
                            confirmed: 0,
                            cancelled: 0,
                            completed: 0,
                            pending: 0,
                            last_booking: null,
                            total_weight: 0
                        };
                    }
                    
                    acc[customerId].total += 1;
                    acc[customerId][booking.status] = (acc[customerId][booking.status] || 0) + 1;
                    acc[customerId].total_weight += parseFloat(booking.estimated_weight) || 0;
                    
                    if (!acc[customerId].last_booking || new Date(booking.created_at) > new Date(acc[customerId].last_booking)) {
                        acc[customerId].last_booking = booking.created_at;
                    }
                    
                    return acc;
                }, {});
            }

            if (shipmentStatsResponse.ok) {
                const allShipments = await shipmentStatsResponse.json();
                
                // Calculate shipment stats per customer
                shipmentStats = allShipments.reduce((acc, shipment) => {
                    const customerId = shipment.customer_id;
                    if (!acc[customerId]) {
                        acc[customerId] = {
                            total: 0,
                            delivered: 0,
                            in_transit: 0,
                            pending: 0,
                            last_shipment: null,
                            total_weight: 0
                        };
                    }
                    
                    acc[customerId].total += 1;
                    if (shipment.status) {
                        acc[customerId][shipment.status] = (acc[customerId][shipment.status] || 0) + 1;
                    }
                    acc[customerId].total_weight += parseFloat(shipment.total_weight) || 0;
                    
                    if (!acc[customerId].last_shipment || new Date(shipment.created_at) > new Date(acc[customerId].last_shipment)) {
                        acc[customerId].last_shipment = shipment.created_at;
                    }
                    
                    return acc;
                }, {});
            }
        }

        // Helper function to extract name from profile
        const extractCustomerName = (profile: any) => {
            // Try first_name + last_name first
            if (profile.first_name || profile.last_name) {
                const full = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
                if (full) return { first_name: profile.first_name || '', last_name: profile.last_name || '', full_name: full };
            }
            
            // Fallback to contact_person if available
            if (profile.contact_person) {
                const contactPerson = profile.contact_person.trim();
                // Try to split contact_person into first and last name
                const parts = contactPerson.split(/\s+/);
                if (parts.length >= 2) {
                    const first = parts[0];
                    const last = parts.slice(1).join(' ');
                    return { first_name: first, last_name: last, full_name: contactPerson };
                } else {
                    return { first_name: contactPerson, last_name: '', full_name: contactPerson };
                }
            }
            
            // Last resort: use company name or email
            if (profile.company_name) {
                return { first_name: profile.company_name, last_name: '', full_name: profile.company_name };
            }
            
            return { first_name: '', last_name: '', full_name: profile.email || 'N/A' };
        };

        // Format customer data for response
        const enrichedCustomers = profiles.map(profile => {
            const stats = bookingStats[profile.user_id] || {
                total: 0, confirmed: 0, cancelled: 0, completed: 0, pending: 0, last_booking: null, total_weight: 0
            };

            const nameInfo = extractCustomerName(profile);

            // Get shipment stats for this customer (from pre-fetched data)
            const shipmentData = shipmentStats[profile.user_id] || {
                total: 0, delivered: 0, in_transit: 0, pending: 0, last_shipment: null, total_weight: 0
            };

            // Calculate customer tier based on total bookings AND shipments (real activity)
            let customerTier = 'new';
            const totalActivity = stats.total + shipmentData.total;
            const totalWeight = (stats.total_weight || 0) + (shipmentData.total_weight || 0);
            
            if (totalActivity >= 20 || totalWeight >= 1000) customerTier = 'vip';
            else if (totalActivity >= 10 || totalWeight >= 500) customerTier = 'premium';
            else if (totalActivity >= 3 || totalWeight >= 100) customerTier = 'regular';

            // Calculate days since last booking
            const daysSinceLastBooking = stats.last_booking ? 
                Math.floor((new Date().getTime() - new Date(stats.last_booking).getTime()) / (1000 * 60 * 60 * 24)) : null;

            return {
                id: profile.user_id,
                first_name: nameInfo.first_name,
                last_name: nameInfo.last_name,
                full_name: nameInfo.full_name,
                email: profile.email || '',
                phone: profile.phone || '',
                company_name: profile.company_name || '',
                contact_person: profile.contact_person || '',
                city: profile.city || '',
                state: profile.state || '',
                country: profile.country || '',
                business_type: profile.business_type || '',
                profile_completion_percentage: profile.profile_completion_percentage || 0,
                customer_since: profile.created_at,
                last_profile_update: profile.profile_updated_at,
                
                // Booking statistics (REAL-TIME)
                total_bookings: stats.total,
                confirmed_bookings: stats.confirmed,
                completed_bookings: stats.completed,
                cancelled_bookings: stats.cancelled,
                pending_bookings: stats.pending,
                last_booking_date: stats.last_booking,
                days_since_last_booking: daysSinceLastBooking,
                
                // Shipment statistics (REAL-TIME)
                total_shipments: shipmentData.total,
                delivered_shipments: shipmentData.delivered,
                in_transit_shipments: shipmentData.in_transit,
                pending_shipments: shipmentData.pending,
                last_shipment_date: shipmentData.last_shipment,
                total_weight_shipped: Math.round((stats.total_weight || 0) + (shipmentData.total_weight || 0)),
                
                customer_tier: customerTier,
                
                // Calculated fields (REAL-TIME)
                cancellation_rate: stats.total > 0 ? ((stats.cancelled / stats.total) * 100).toFixed(1) : '0.0',
                total_activity: totalActivity, // Combined bookings + shipments
                is_active: (daysSinceLastBooking === null || daysSinceLastBooking <= 90) || 
                          (shipmentData.last_shipment && 
                           Math.floor((new Date().getTime() - new Date(shipmentData.last_shipment).getTime()) / (1000 * 60 * 60 * 24)) <= 90)
            };
        });

        const result = {
            success: true,
            data: {
                customers: enrichedCustomers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit),
                    hasNextPage: (page * limit) < totalCount,
                    hasPrevPage: page > 1
                },
                summary: {
                    total_customers: totalCount,
                    active_customers: enrichedCustomers.filter(c => c.is_active).length,
                    new_customers: enrichedCustomers.filter(c => c.customer_tier === 'new').length,
                    vip_customers: enrichedCustomers.filter(c => c.customer_tier === 'vip').length
                },
                filters_applied: {
                    search_term,
                    ...filters
                }
            }
        };

        // Log successful data access
        logAdminAction('CUSTOMER_LIST_SUCCESS', authResult.user!, {
            customers_returned: enrichedCustomers.length,
            total_customers: totalCount,
            filters_applied: { search_term, ...filters }
        });

        return createSuccessResponse(result);

    } catch (error) {
        console.error('Admin customer list error:', error);
        return createErrorResponse('ADMIN_CUSTOMER_LIST_FAILED', error.message, 500);
    }
});