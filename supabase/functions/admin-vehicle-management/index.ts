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
            action, // 'list', 'optimize_routes', 'assign_bulk', 'capacity_analysis', 'performance_metrics'
            date,
            vehicle_ids,
            optimization_params = {}
        } = await req.json();

        console.log('Admin vehicle management request:', { action, date, vehicle_ids, optimization_params });

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        if (!action) {
            throw new Error('Action is required');
        }

        let result = {};

        switch (action) {
            case 'list':
                result = await listVehiclesWithCapacity(supabaseUrl, serviceRoleKey, date);
                break;
            
            case 'optimize_routes':
                result = await optimizeRoutes(supabaseUrl, serviceRoleKey, date, optimization_params);
                break;
            
            case 'assign_bulk':
                result = await bulkAssignBookings(supabaseUrl, serviceRoleKey, date, optimization_params);
                break;
            
            case 'capacity_analysis':
                result = await analyzeCapacity(supabaseUrl, serviceRoleKey, date);
                break;
            
            case 'performance_metrics':
                result = await getPerformanceMetrics(supabaseUrl, serviceRoleKey, date || new Date().toISOString().split('T')[0]);
                break;
            
            default:
                throw new Error(`Unknown action: ${action}`);
        }

        const response = {
            data: result,
            meta: {
                action,
                date,
                generated_at: new Date().toISOString()
            }
        };

        return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Admin vehicle management error:', error);

        const errorResponse = {
            error: {
                code: 'ADMIN_VEHICLE_MANAGEMENT_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// List vehicles with current capacity information
async function listVehiclesWithCapacity(supabaseUrl: string, serviceRoleKey: string, date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Get vehicles
    const vehiclesResponse = await fetch(`${supabaseUrl}/rest/v1/vehicles?select=*`, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    if (!vehiclesResponse.ok) {
        throw new Error('Failed to fetch vehicles');
    }

    const vehicles = await vehiclesResponse.json();

    // Get bookings for the target date
    const bookingsQuery = `select=*&window_start=gte.${targetDate}T00:00:00&window_start=lt.${new Date(new Date(targetDate).getTime() + 24*60*60*1000).toISOString()}&status=in.(pending,confirmed)`;
    const bookingsResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?${bookingsQuery}`, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    const bookings = await bookingsResponse.json();

    // Calculate capacity utilization for each vehicle
    const vehiclesWithCapacity = vehicles.map((vehicle: any) => {
        const vehicleBookings = bookings.filter((b: any) => b.assigned_vehicle_id === vehicle.id);
        const usedCapacity = vehicleBookings.reduce((sum: number, b: any) => sum + (parseFloat(b.estimated_weight) || 0), 0);
        const remainingCapacity = vehicle.capacity_lbs - usedCapacity;
        const utilizationRate = (usedCapacity / vehicle.capacity_lbs) * 100;

        // Calculate efficiency metrics
        const totalBookings = vehicleBookings.length;
        const avgBookingWeight = totalBookings > 0 ? usedCapacity / totalBookings : 0;
        
        // Group bookings by time windows for route analysis
        const timeWindows = vehicleBookings.reduce((acc: any, b: any) => {
            const windowStart = new Date(b.window_start).toISOString().substring(11, 16); // HH:MM format
            if (!acc[windowStart]) acc[windowStart] = [];
            acc[windowStart].push({
                booking_id: b.id,
                zip_code: b.address?.zip_code,
                weight: parseFloat(b.estimated_weight) || 0,
                service_type: b.service_type
            });
            return acc;
        }, {});

        return {
            ...vehicle,
            capacity_info: {
                total_capacity_lbs: vehicle.capacity_lbs,
                used_capacity_lbs: Math.round(usedCapacity),
                remaining_capacity_lbs: Math.round(remainingCapacity),
                utilization_rate: parseFloat(utilizationRate.toFixed(1)),
                efficiency_score: calculateEfficiencyScore(utilizationRate, totalBookings, avgBookingWeight)
            },
            current_assignments: {
                total_bookings: totalBookings,
                time_windows: timeWindows,
                avg_booking_weight: Math.round(avgBookingWeight)
            },
            recommendations: generateVehicleRecommendations(vehicle, utilizationRate, totalBookings, remainingCapacity)
        };
    });

    return {
        vehicles: vehiclesWithCapacity,
        fleet_summary: {
            total_vehicles: vehicles.length,
            total_fleet_capacity: vehicles.reduce((sum: number, v: any) => sum + v.capacity_lbs, 0),
            total_used_capacity: vehiclesWithCapacity.reduce((sum: number, v: any) => sum + v.capacity_info.used_capacity_lbs, 0),
            average_utilization: vehiclesWithCapacity.reduce((sum: number, v: any) => sum + v.capacity_info.utilization_rate, 0) / vehicles.length,
            underutilized_count: vehiclesWithCapacity.filter((v: any) => v.capacity_info.utilization_rate < 50).length,
            optimal_count: vehiclesWithCapacity.filter((v: any) => v.capacity_info.utilization_rate >= 50 && v.capacity_info.utilization_rate <= 85).length,
            overutilized_count: vehiclesWithCapacity.filter((v: any) => v.capacity_info.utilization_rate > 85).length
        },
        date: targetDate
    };
}

// Optimize routes based on geographic proximity and time windows
async function optimizeRoutes(supabaseUrl: string, serviceRoleKey: string, date: string, params: any) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Get unassigned bookings for the date
    const unassignedQuery = `select=*&window_start=gte.${targetDate}T00:00:00&window_start=lt.${new Date(new Date(targetDate).getTime() + 24*60*60*1000).toISOString()}&assigned_vehicle_id=is.null&status=in.(pending,confirmed)`;
    const unassignedResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?${unassignedQuery}`, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    const unassignedBookings = await unassignedResponse.json();
    
    if (unassignedBookings.length === 0) {
        return {
            message: 'No unassigned bookings found for optimization',
            optimized_routes: [],
            recommendations: []
        };
    }

    // Group bookings by ZIP code proximity and time windows
    const clusters = clusterBookingsByProximity(unassignedBookings, params.max_cluster_distance || 5);
    
    // Get available vehicles
    const vehiclesData = await listVehiclesWithCapacity(supabaseUrl, serviceRoleKey, targetDate);
    const availableVehicles = vehiclesData.vehicles.filter((v: any) => v.capacity_info.remaining_capacity_lbs > 0);
    
    // Optimize assignments
    const optimizedRoutes = [];
    const recommendations = [];

    for (const cluster of clusters) {
        const clusterWeight = cluster.bookings.reduce((sum: number, b: any) => sum + (parseFloat(b.estimated_weight) || 0), 0);
        
        // Find best vehicle for this cluster
        const bestVehicle = findBestVehicleForCluster(availableVehicles, cluster, clusterWeight);
        
        if (bestVehicle) {
            optimizedRoutes.push({
                vehicle_id: bestVehicle.id,
                vehicle_name: bestVehicle.name,
                cluster_id: cluster.id,
                cluster_center: cluster.center_zip,
                bookings: cluster.bookings,
                total_weight: clusterWeight,
                estimated_efficiency_gain: calculateEfficiencyGain(cluster, bestVehicle),
                recommended_sequence: optimizeBookingSequence(cluster.bookings)
            });
            
            // Update vehicle capacity
            bestVehicle.capacity_info.remaining_capacity_lbs -= clusterWeight;
        } else {
            recommendations.push({
                type: 'capacity_shortage',
                message: `No available vehicle found for cluster in ${cluster.center_zip} area (${clusterWeight} lbs needed)`,
                affected_bookings: cluster.bookings.length,
                suggested_action: 'Consider splitting bookings or adding vehicle capacity'
            });
        }
    }

    // Add general recommendations
    if (optimizedRoutes.length > 0) {
        const totalEfficiencyGain = optimizedRoutes.reduce((sum: number, r: any) => sum + r.estimated_efficiency_gain, 0);
        recommendations.push({
            type: 'optimization_summary',
            message: `Route optimization can improve efficiency by ${totalEfficiencyGain.toFixed(1)}%`,
            affected_routes: optimizedRoutes.length,
            suggested_action: 'Apply optimized vehicle assignments'
        });
    }

    return {
        optimized_routes: optimizedRoutes,
        recommendations,
        summary: {
            total_bookings_optimized: optimizedRoutes.reduce((sum: number, r: any) => sum + r.bookings.length, 0),
            clusters_created: clusters.length,
            routes_optimized: optimizedRoutes.length,
            efficiency_improvement: optimizedRoutes.reduce((sum: number, r: any) => sum + r.estimated_efficiency_gain, 0) / optimizedRoutes.length
        }
    };
}

// Bulk assign bookings to vehicles based on optimization
async function bulkAssignBookings(supabaseUrl: string, serviceRoleKey: string, date: string, params: any) {
    const { assignments } = params;
    
    if (!assignments || assignments.length === 0) {
        throw new Error('No assignments provided for bulk operation');
    }

    const results = [];
    
    for (const assignment of assignments) {
        const { booking_ids, vehicle_id, reason } = assignment;
        
        for (const booking_id of booking_ids) {
            try {
                // Update booking with vehicle assignment
                const updateResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${booking_id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        assigned_vehicle_id: vehicle_id,
                        status: 'confirmed',
                        internal_notes: reason || 'Bulk assigned via admin optimization',
                        updated_at: new Date().toISOString()
                    })
                });

                if (updateResponse.ok) {
                    results.push({
                        booking_id,
                        vehicle_id,
                        success: true,
                        message: 'Successfully assigned'
                    });
                } else {
                    const errorText = await updateResponse.text();
                    results.push({
                        booking_id,
                        vehicle_id,
                        success: false,
                        message: `Assignment failed: ${errorText}`
                    });
                }
            } catch (error) {
                results.push({
                    booking_id,
                    vehicle_id,
                    success: false,
                    message: `Assignment error: ${error.message}`
                });
            }
        }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return {
        assignment_results: results,
        summary: {
            total_assignments: results.length,
            successful: successCount,
            failed: failureCount,
            success_rate: ((successCount / results.length) * 100).toFixed(1) + '%'
        }
    };
}

// Analyze fleet capacity and provide insights
async function analyzeCapacity(supabaseUrl: string, serviceRoleKey: string, date: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const vehiclesData = await listVehiclesWithCapacity(supabaseUrl, serviceRoleKey, targetDate);
    
    // Analyze capacity patterns
    const capacityInsights = {
        current_utilization: vehiclesData.fleet_summary,
        bottlenecks: [],
        opportunities: [],
        recommendations: []
    };

    // Identify bottlenecks
    const overutilizedVehicles = vehiclesData.vehicles.filter((v: any) => v.capacity_info.utilization_rate > 90);
    if (overutilizedVehicles.length > 0) {
        capacityInsights.bottlenecks.push({
            type: 'capacity_constraint',
            affected_vehicles: overutilizedVehicles.length,
            message: `${overutilizedVehicles.length} vehicle(s) are over 90% capacity`,
            impact: 'May cause booking rejections or delays'
        });
    }

    // Identify opportunities
    const underutilizedVehicles = vehiclesData.vehicles.filter((v: any) => v.capacity_info.utilization_rate < 50);
    if (underutilizedVehicles.length > 0) {
        capacityInsights.opportunities.push({
            type: 'unused_capacity',
            available_vehicles: underutilizedVehicles.length,
            total_unused_capacity: underutilizedVehicles.reduce((sum: number, v: any) => sum + v.capacity_info.remaining_capacity_lbs, 0),
            message: `${underutilizedVehicles.length} vehicle(s) have significant unused capacity`
        });
    }

    // Generate recommendations
    if (vehiclesData.fleet_summary.average_utilization < 60) {
        capacityInsights.recommendations.push({
            priority: 'medium',
            action: 'consolidate_routes',
            message: 'Consider consolidating routes to improve vehicle utilization',
            potential_benefit: 'Reduce operational costs by 10-15%'
        });
    }

    if (overutilizedVehicles.length > vehiclesData.vehicles.length * 0.3) {
        capacityInsights.recommendations.push({
            priority: 'high',
            action: 'increase_capacity',
            message: 'Consider adding vehicle capacity or adjusting scheduling',
            potential_benefit: 'Prevent booking rejections and improve customer satisfaction'
        });
    }

    return capacityInsights;
}

// Get performance metrics for vehicles
async function getPerformanceMetrics(supabaseUrl: string, serviceRoleKey: string, date: string) {
    const sevenDaysAgo = new Date(new Date(date).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Get bookings for the last 7 days
    const bookingsQuery = `select=*&window_start=gte.${sevenDaysAgo}T00:00:00&window_start=lte.${date}T23:59:59`;
    const bookingsResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?${bookingsQuery}`, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    const bookings = await bookingsResponse.json();
    
    // Get vehicles
    const vehiclesResponse = await fetch(`${supabaseUrl}/rest/v1/vehicles?select=*`, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });
    
    const vehicles = await vehiclesResponse.json();

    // Calculate performance metrics per vehicle
    const vehicleMetrics = vehicles.map((vehicle: any) => {
        const vehicleBookings = bookings.filter((b: any) => b.assigned_vehicle_id === vehicle.id);
        const completedBookings = vehicleBookings.filter((b: any) => b.status === 'completed');
        const totalRevenue = vehicleBookings.reduce((sum: number, b: any) => sum + (parseFloat(b.total_amount) || 0), 0);
        
        return {
            vehicle_id: vehicle.id,
            vehicle_name: vehicle.name,
            metrics: {
                total_bookings: vehicleBookings.length,
                completed_bookings: completedBookings.length,
                completion_rate: vehicleBookings.length > 0 ? (completedBookings.length / vehicleBookings.length * 100).toFixed(1) + '%' : '0%',
                total_revenue: totalRevenue.toFixed(2),
                avg_revenue_per_booking: vehicleBookings.length > 0 ? (totalRevenue / vehicleBookings.length).toFixed(2) : '0.00',
                utilization_trend: 'stable' // Placeholder - would calculate actual trend
            }
        };
    });

    return {
        vehicle_performance: vehicleMetrics,
        fleet_totals: {
            total_bookings: bookings.length,
            total_revenue: bookings.reduce((sum: number, b: any) => sum + (parseFloat(b.total_amount) || 0), 0).toFixed(2),
            average_completion_rate: vehicleMetrics.reduce((sum: number, v: any) => sum + parseFloat(v.metrics.completion_rate), 0) / vehicles.length,
            top_performer: vehicleMetrics.sort((a: any, b: any) => parseFloat(b.metrics.total_revenue) - parseFloat(a.metrics.total_revenue))[0]?.vehicle_name || 'N/A'
        },
        period: `${sevenDaysAgo} to ${date}`
    };
}

// Helper functions
function calculateEfficiencyScore(utilizationRate: number, totalBookings: number, avgBookingWeight: number): number {
    // Efficiency score based on utilization, booking count, and average weight
    let score = 0;
    
    // Utilization score (50-85% is optimal)
    if (utilizationRate >= 50 && utilizationRate <= 85) {
        score += 40;
    } else if (utilizationRate >= 40 && utilizationRate < 90) {
        score += 30;
    } else {
        score += 10;
    }
    
    // Booking count score (more bookings generally better)
    score += Math.min(totalBookings * 5, 30);
    
    // Weight efficiency score
    if (avgBookingWeight > 100) {
        score += 30;
    } else if (avgBookingWeight > 50) {
        score += 20;
    } else {
        score += 10;
    }
    
    return Math.min(score, 100);
}

function generateVehicleRecommendations(vehicle: any, utilizationRate: number, totalBookings: number, remainingCapacity: number): string[] {
    const recommendations = [];
    
    if (utilizationRate < 30) {
        recommendations.push('Consider consolidating loads from other vehicles');
    } else if (utilizationRate > 90) {
        recommendations.push('At capacity - consider redistributing some bookings');
    }
    
    if (totalBookings < 2 && remainingCapacity > vehicle.capacity_lbs * 0.5) {
        recommendations.push('Vehicle has significant unused capacity - suitable for additional bookings');
    }
    
    if (totalBookings > 8) {
        recommendations.push('High booking volume - ensure adequate time allocation');
    }
    
    return recommendations.length > 0 ? recommendations : ['Operating efficiently'];
}

function clusterBookingsByProximity(bookings: any[], maxDistance: number): any[] {
    // Simplified clustering based on ZIP code proximity
    const clusters: any[] = [];
    const processed = new Set();
    
    bookings.forEach((booking, index) => {
        if (processed.has(index)) return;
        
        const cluster = {
            id: `cluster_${clusters.length + 1}`,
            center_zip: booking.address?.zip_code,
            bookings: [booking]
        };
        
        // Find nearby bookings (simplified - in production would use actual geographic distance)
        bookings.forEach((otherBooking, otherIndex) => {
            if (index !== otherIndex && !processed.has(otherIndex)) {
                const zipDiff = Math.abs(parseInt(booking.address?.zip_code || '0') - parseInt(otherBooking.address?.zip_code || '0'));
                if (zipDiff <= maxDistance) {
                    cluster.bookings.push(otherBooking);
                    processed.add(otherIndex);
                }
            }
        });
        
        processed.add(index);
        clusters.push(cluster);
    });
    
    return clusters;
}

function findBestVehicleForCluster(vehicles: any[], cluster: any, totalWeight: number): any | null {
    // Find vehicle with best fit (sufficient capacity, good efficiency)
    return vehicles
        .filter((v: any) => v.capacity_info.remaining_capacity_lbs >= totalWeight)
        .sort((a: any, b: any) => {
            // Prefer vehicles with capacity closest to requirement
            const aFit = Math.abs(a.capacity_info.remaining_capacity_lbs - totalWeight);
            const bFit = Math.abs(b.capacity_info.remaining_capacity_lbs - totalWeight);
            return aFit - bFit;
        })[0] || null;
}

function calculateEfficiencyGain(cluster: any, vehicle: any): number {
    // Simplified efficiency gain calculation
    const baseEfficiency = 60; // Baseline
    const clusterBonus = Math.min(cluster.bookings.length * 5, 25); // Bonus for multiple bookings
    const capacityBonus = vehicle.capacity_info.utilization_rate < 70 ? 10 : 5;
    
    return Math.min(baseEfficiency + clusterBonus + capacityBonus, 95) - baseEfficiency;
}

function optimizeBookingSequence(bookings: any[]): any[] {
    // Simple optimization by time and geography
    return bookings.sort((a: any, b: any) => {
        const timeA = new Date(a.window_start).getTime();
        const timeB = new Date(b.window_start).getTime();
        if (timeA !== timeB) return timeA - timeB;
        
        // If same time, sort by ZIP code
        const zipA = parseInt(a.address?.zip_code || '0');
        const zipB = parseInt(b.address?.zip_code || '0');
        return zipA - zipB;
    });
}