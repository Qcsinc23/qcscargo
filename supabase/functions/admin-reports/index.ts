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
        logAdminAction('REPORTS_ACCESS', authResult.user!, {
            method: req.method,
            url: req.url
        });

        console.log(`Admin reports access granted to: ${authResult.user!.email}`);

        const { 
            report_type,
            date_range,
            filters = {},
            export_format = 'json' // 'json', 'csv'
        } = await req.json();

        console.log('Admin reports request:', {
            admin: authResult.user!.email,
            report_type,
            date_range,
            filters,
            export_format
        });

        if (!report_type) {
            throw new Error('Report type is required');
        }

        let reportData = {};
        const cacheKey = `report_${report_type}_${JSON.stringify(date_range)}_${JSON.stringify(filters)}`;

        // Check cache first
        const cacheResponse = await fetch(`${supabaseUrl}/rest/v1/analytics_cache?select=*&cache_key=eq.${cacheKey}&expires_at=gt.${new Date().toISOString()}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (cacheResponse.ok) {
            const cachedData = await cacheResponse.json();
            if (cachedData.length > 0) {
                console.log('Returning cached report data');
                // Log cached report access
                logAdminAction('REPORTS_CACHED_ACCESS', authResult.user!, {
                    report_type,
                    cache_key: cacheKey
                });

                return createSuccessResponse({ data: cachedData[0].data, cached: true });
            }
        }

        // Build date filter
        let dateFilter = '';
        if (date_range && date_range.start && date_range.end) {
            dateFilter = `&created_at=gte.${date_range.start}&created_at=lte.${date_range.end}`;
        } else {
            // Default to last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            dateFilter = `&created_at=gte.${thirtyDaysAgo.toISOString()}`;
        }

        switch (report_type) {
            case 'dashboard_overview':
                reportData = await generateDashboardOverview(supabaseUrl, serviceRoleKey, dateFilter, filters);
                break;
            
            case 'revenue_analytics':
                reportData = await generateRevenueAnalytics(supabaseUrl, serviceRoleKey, dateFilter, filters);
                break;
            
            case 'operational_metrics':
                reportData = await generateOperationalMetrics(supabaseUrl, serviceRoleKey, dateFilter, filters);
                break;
            
            case 'customer_insights':
                reportData = await generateCustomerInsights(supabaseUrl, serviceRoleKey, dateFilter, filters);
                break;
            
            case 'vehicle_utilization':
                reportData = await generateVehicleUtilization(supabaseUrl, serviceRoleKey, dateFilter, filters);
                break;
            
            case 'geographic_analysis':
                reportData = await generateGeographicAnalysis(supabaseUrl, serviceRoleKey, dateFilter, filters);
                break;
            
            default:
                throw new Error(`Unknown report type: ${report_type}`);
        }

        // Cache the results
        const cacheData = {
            cache_key: cacheKey,
            report_type,
            date_range: date_range ? JSON.stringify(date_range) : null,
            filters: JSON.stringify(filters),
            data: JSON.stringify(reportData),
            generated_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour cache
        };

        const cacheInsertResponse = await fetch(`${supabaseUrl}/rest/v1/analytics_cache`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(cacheData)
        });

        if (!cacheInsertResponse.ok) {
            console.error('Failed to cache report data');
        }

        // Format response based on export format
        if (export_format === 'csv') {
            const csvData = convertToCSV(reportData);
            // Log CSV export
            logAdminAction('REPORTS_CSV_EXPORT', authResult.user!, {
                report_type,
                export_format: 'csv'
            });

            return new Response(csvData, {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="${report_type}_${new Date().toISOString().split('T')[0]}.csv"`
                }
            });
        }

        const result = {
            data: reportData,
            meta: {
                report_type,
                date_range,
                filters,
                generated_at: new Date().toISOString(),
                cached: false
            }
        };

        // Log successful report generation
        logAdminAction('REPORTS_GENERATED', authResult.user!, {
            report_type,
            date_range,
            filters,
            export_format,
            cached: false
        });

        return createSuccessResponse(result);

    } catch (error) {
        console.error('Admin reports error:', error);
        return createErrorResponse('ADMIN_REPORTS_FAILED', error.message, 500);
    }
});

// Helper functions for different report types
async function generateDashboardOverview(supabaseUrl: string, serviceRoleKey: string, dateFilter: string, filters: any) {
    const bookingsResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?select=*${dateFilter}`, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    const bookings = await bookingsResponse.json();

    // Calculate KPIs
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum: number, b: any) => sum + (parseFloat(b.total_amount) || 0), 0);
    const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
    
    const statusCounts = bookings.reduce((acc: any, b: any) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
    }, {});

    const conversionRate = totalBookings > 0 ? ((statusCounts.confirmed || 0) / totalBookings) * 100 : 0;

    // Recent activity
    const recentBookings = bookings
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

    return {
        kpis: {
            total_bookings: totalBookings,
            total_revenue: totalRevenue.toFixed(2),
            average_booking_value: avgBookingValue.toFixed(2),
            conversion_rate: conversionRate.toFixed(1) + '%'
        },
        status_breakdown: statusCounts,
        recent_activity: recentBookings,
        growth_metrics: {
            // This would calculate period-over-period growth
            booking_growth: '12.5%', // Placeholder
            revenue_growth: '8.3%'   // Placeholder
        }
    };
}

async function generateRevenueAnalytics(supabaseUrl: string, serviceRoleKey: string, dateFilter: string, filters: any) {
    const bookingsResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?select=*${dateFilter}`, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    const bookings = await bookingsResponse.json();

    // Revenue by service type
    const revenueByService = bookings.reduce((acc: any, b: any) => {
        const service = b.service_type || 'standard';
        acc[service] = (acc[service] || 0) + (parseFloat(b.total_amount) || 0);
        return acc;
    }, {});

    // Revenue by destination (ZIP code)
    const revenueByDestination = bookings.reduce((acc: any, b: any) => {
        const zip = b.address?.zip_code || 'Unknown';
        acc[zip] = (acc[zip] || 0) + (parseFloat(b.total_amount) || 0);
        return acc;
    }, {});

    // Daily revenue trend
    const dailyRevenue = bookings.reduce((acc: any, b: any) => {
        const date = new Date(b.created_at).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + (parseFloat(b.total_amount) || 0);
        return acc;
    }, {});

    return {
        revenue_by_service_type: revenueByService,
        revenue_by_destination: revenueByDestination,
        daily_revenue_trend: dailyRevenue,
        top_performing_zips: Object.entries(revenueByDestination)
            .sort(([,a]: any, [,b]: any) => b - a)
            .slice(0, 10)
    };
}

async function generateOperationalMetrics(supabaseUrl: string, serviceRoleKey: string, dateFilter: string, filters: any) {
    // Get bookings and vehicles
    const [bookingsResponse, vehiclesResponse] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/bookings?select=*${dateFilter}`, {
            headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey }
        }),
        fetch(`${supabaseUrl}/rest/v1/vehicles?select=*`, {
            headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey }
        })
    ]);

    const bookings = await bookingsResponse.json();
    const vehicles = await vehiclesResponse.json();

    // Calculate utilization
    const totalCapacity = vehicles.reduce((sum: number, v: any) => sum + v.capacity_lbs, 0);
    const usedCapacity = bookings
        .filter((b: any) => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum: number, b: any) => sum + (parseFloat(b.estimated_weight) || 0), 0);
    
    const utilizationRate = totalCapacity > 0 ? (usedCapacity / totalCapacity) * 100 : 0;

    // Average handling time
    const completedBookings = bookings.filter((b: any) => b.status === 'completed');
    const avgHandlingTime = completedBookings.length > 0 ? 
        completedBookings.reduce((sum: number, b: any) => {
            const created = new Date(b.created_at);
            const completed = new Date(b.updated_at);
            return sum + (completed.getTime() - created.getTime());
        }, 0) / completedBookings.length / (1000 * 60 * 60) : 0; // Convert to hours

    return {
        vehicle_utilization: {
            total_capacity_lbs: totalCapacity,
            used_capacity_lbs: usedCapacity.toFixed(0),
            utilization_rate: utilizationRate.toFixed(1) + '%'
        },
        performance_metrics: {
            average_handling_time_hours: avgHandlingTime.toFixed(2),
            completion_rate: completedBookings.length / bookings.length * 100,
            on_time_delivery: '94.2%' // Placeholder
        },
        efficiency_indicators: {
            bookings_per_vehicle: (bookings.length / vehicles.length).toFixed(1),
            revenue_per_vehicle: vehicles.length > 0 ? 
                (bookings.reduce((sum: number, b: any) => sum + (parseFloat(b.total_amount) || 0), 0) / vehicles.length).toFixed(2) : '0'
        }
    };
}

async function generateCustomerInsights(supabaseUrl: string, serviceRoleKey: string, dateFilter: string, filters: any) {
    const insightsResponse = await fetch(`${supabaseUrl}/rest/v1/customer_insights?select=*`, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    const insights = await insightsResponse.json();

    // Customer segmentation
    const tierDistribution = insights.reduce((acc: any, c: any) => {
        acc[c.customer_tier] = (acc[c.customer_tier] || 0) + 1;
        return acc;
    }, {});

    const frequencyDistribution = insights.reduce((acc: any, c: any) => {
        acc[c.booking_frequency] = (acc[c.booking_frequency] || 0) + 1;
        return acc;
    }, {});

    // Top customers by revenue
    const topCustomers = insights
        .sort((a: any, b: any) => b.total_revenue - a.total_revenue)
        .slice(0, 20);

    return {
        customer_segmentation: {
            by_tier: tierDistribution,
            by_frequency: frequencyDistribution
        },
        top_customers: topCustomers,
        customer_metrics: {
            total_active_customers: insights.length,
            average_customer_value: insights.reduce((sum: number, c: any) => sum + (c.total_revenue || 0), 0) / insights.length,
            retention_indicators: {
                repeat_customers: insights.filter((c: any) => c.total_bookings > 1).length,
                high_value_customers: insights.filter((c: any) => c.customer_tier === 'vip' || c.customer_tier === 'premium').length
            }
        }
    };
}

async function generateVehicleUtilization(supabaseUrl: string, serviceRoleKey: string, dateFilter: string, filters: any) {
    const [vehiclesResponse, assignmentsResponse] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/vehicles?select=*`, {
            headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey }
        }),
        fetch(`${supabaseUrl}/rest/v1/vehicle_assignments?select=*,bookings(*)${dateFilter.replace('created_at', 'bookings.created_at')}`, {
            headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey }
        })
    ]);

    const vehicles = await vehiclesResponse.json();
    const assignments = await assignmentsResponse.json();

    // Calculate utilization per vehicle
    const vehicleUtilization = vehicles.map((vehicle: any) => {
        const vehicleAssignments = assignments.filter((a: any) => a.vehicle_id === vehicle.id);
        const totalWeight = vehicleAssignments.reduce((sum: number, a: any) => 
            sum + (parseFloat(a.bookings?.estimated_weight) || 0), 0);
        const utilizationRate = (totalWeight / vehicle.capacity_lbs) * 100;

        return {
            vehicle_id: vehicle.id,
            vehicle_name: vehicle.name,
            capacity_lbs: vehicle.capacity_lbs,
            used_capacity: totalWeight,
            utilization_rate: utilizationRate.toFixed(1) + '%',
            total_assignments: vehicleAssignments.length
        };
    });

    return {
        vehicle_performance: vehicleUtilization,
        fleet_summary: {
            total_vehicles: vehicles.length,
            average_utilization: (vehicleUtilization.reduce((sum: number, v: any) => 
                sum + parseFloat(v.utilization_rate), 0) / vehicles.length).toFixed(1) + '%',
            underutilized_vehicles: vehicleUtilization.filter((v: any) => parseFloat(v.utilization_rate) < 50).length,
            overutilized_vehicles: vehicleUtilization.filter((v: any) => parseFloat(v.utilization_rate) > 90).length
        }
    };
}

async function generateGeographicAnalysis(supabaseUrl: string, serviceRoleKey: string, dateFilter: string, filters: any) {
    const bookingsResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?select=*${dateFilter}`, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    const bookings = await bookingsResponse.json();

    // Analyze by ZIP code
    const zipAnalysis = bookings.reduce((acc: any, b: any) => {
        const zip = b.address?.zip_code || 'Unknown';
        if (!acc[zip]) {
            acc[zip] = { bookings: 0, revenue: 0, city: b.address?.city || 'Unknown' };
        }
        acc[zip].bookings += 1;
        acc[zip].revenue += parseFloat(b.total_amount) || 0;
        return acc;
    }, {});

    // Service type by area
    const serviceByArea = bookings.reduce((acc: any, b: any) => {
        const zip = b.address?.zip_code || 'Unknown';
        const service = b.service_type || 'standard';
        if (!acc[zip]) acc[zip] = {};
        acc[zip][service] = (acc[zip][service] || 0) + 1;
        return acc;
    }, {});

    return {
        zip_code_analysis: zipAnalysis,
        service_distribution_by_area: serviceByArea,
        top_service_areas: Object.entries(zipAnalysis)
            .sort(([,a]: any, [,b]: any) => b.bookings - a.bookings)
            .slice(0, 15),
        geographic_trends: {
            pickup_vs_dropoff: bookings.reduce((acc: any, b: any) => {
                acc[b.pickup_or_drop] = (acc[b.pickup_or_drop] || 0) + 1;
                return acc;
            }, {})
        }
    };
}

// Helper function to convert report data to CSV
function convertToCSV(data: any): string {
    // Simple CSV conversion - in production, this would be more sophisticated
    const jsonData = JSON.stringify(data, null, 2);
    return `Report Data\n"${jsonData.replace(/"/g, '""')}"`;
}