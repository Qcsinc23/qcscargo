import { corsHeaders } from "../_shared/cors-utils.ts";
import { verifyAdminAccess } from "../_shared/auth-utils.ts";
import { sendEmail, generateNotificationEmail } from "../_shared/email-utils.ts";

Deno.serve(async (req) => {
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

        // Use standardized admin verification
        const authResult = await verifyAdminAccess(authHeader, supabaseUrl, serviceRoleKey);
        
        if (!authResult.success) {
            throw new Error(authResult.error || 'Access denied: Admin role required');
        }

        const userId = authResult.user!.id;

        // Parse request data and query parameters
        const url = new URL(req.url);
        const requestMethod = req.method;
        const requestData = requestMethod === 'POST' || requestMethod === 'PUT' ? await req.json() : {};

        // Handle different actions
        const action = requestData.action || url.searchParams.get('action') || 'list';

        console.log('Admin shipments management action:', action);

        switch (action) {
            case 'list':
                return await handleListShipments(supabaseUrl, serviceRoleKey, url);
            
            case 'get':
                return await handleGetShipment(supabaseUrl, serviceRoleKey, requestData.shipment_id);
            
            case 'update_status':
                return await handleUpdateStatus(supabaseUrl, serviceRoleKey, requestData, userId);
            
            case 'bulk_update_status':
                return await handleBulkUpdateStatus(supabaseUrl, serviceRoleKey, requestData, userId);
            
            case 'add_tracking':
                return await handleAddTracking(supabaseUrl, serviceRoleKey, requestData, userId);
            
            case 'stats':
                return await handleGetStats(supabaseUrl, serviceRoleKey);
            
            default:
                throw new Error(`Unknown action: ${action}`);
        }

    } catch (error) {
        console.error('Error in admin shipments management:', error);
        return new Response(JSON.stringify({ 
            error: { 
                message: error instanceof Error ? error.message : 'An error occurred',
                code: 'ADMIN_SHIPMENTS_ERROR'
            } 
        }), { 
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
    if (status && status !== 'all') filters.push(`status=eq.${status}`);
    if (customerId) filters.push(`customer_id=eq.${customerId}`);
    
    const filterQuery = filters.length > 0 ? `&${filters.join('&')}` : '';

    // Fetch shipments with destination details (avoid problematic user_profiles join)
    const shipmentsResponse = await fetch(
        `${supabaseUrl}/rest/v1/shipments?select=*,destinations!destination_id(country_name,city_name)${filterQuery}&limit=${limit}&offset=${offset}&order=${sortBy}.${sortOrder}`,
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
        console.error('Failed to fetch shipments:', errorText);
        throw new Error(`Failed to fetch shipments: ${errorText}`);
    }

    const shipments = await shipmentsResponse.json();

    // Fetch user profiles for all unique customer IDs
    const customerIds = [...new Set(shipments.map((s: any) => s.customer_id).filter(Boolean))];
    let customerProfiles: Record<string, any> = {};
    
    if (customerIds.length > 0) {
        try {
            // Fetch profiles using PostgREST - fetch all and filter, or use individual queries for small sets
            // For better performance with multiple IDs, fetch all user_profiles and filter in memory
            // This works better than trying to use complex PostgREST syntax
            const profilesResponse = await fetch(
                `${supabaseUrl}/rest/v1/user_profiles?select=user_id,contact_person,company_name,phone,first_name,last_name,email&limit=1000`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (profilesResponse.ok) {
                const allProfiles = await profilesResponse.json();
                // Filter to only the customer IDs we need
                const relevantProfiles = allProfiles.filter((profile: any) => 
                    customerIds.includes(profile.user_id)
                );
                relevantProfiles.forEach((profile: any) => {
                    customerProfiles[profile.user_id] = profile;
                });
            } else {
                const errorText = await profilesResponse.text();
                console.warn('Failed to fetch customer profiles:', errorText);
            }
        } catch (error) {
            console.warn('Failed to fetch customer profiles:', error);
            // Continue without customer profiles - non-fatal
        }
    }

    // Enrich each shipment with items count, latest tracking, and customer info
    const enrichedShipments = await Promise.all(shipments.map(async (shipment: any) => {
        // Get items count
        const itemsResponse = await fetch(
            `${supabaseUrl}/rest/v1/shipment_items?shipment_id=eq.${shipment.id}&select=id`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );
        const items = itemsResponse.ok ? await itemsResponse.json() : [];
        
        // Get latest tracking entry
        const trackingResponse = await fetch(
            `${supabaseUrl}/rest/v1/shipment_tracking?shipment_id=eq.${shipment.id}&order=timestamp.desc&limit=1`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );
        const trackingEntries = trackingResponse.ok ? await trackingResponse.json() : [];
        
        // Get customer profile info
        const customerProfile = shipment.customer_id ? customerProfiles[shipment.customer_id] : null;
        
        // Extract destination data (destinations join)
        const destination = shipment.destinations ? (Array.isArray(shipment.destinations) ? shipment.destinations[0] : shipment.destinations) : null;
        
        // Remove raw destinations and user_profiles to avoid confusion, but keep customer_id for reference
        const { destinations: _, user_profiles: __, ...shipmentData } = shipment;
        
        // Build customer object
        let customerObj = null;
        if (customerProfile) {
            const firstName = customerProfile.first_name || (customerProfile.contact_person ? customerProfile.contact_person.split(' ')[0] : '') || '';
            const lastName = customerProfile.last_name || (customerProfile.contact_person ? customerProfile.contact_person.split(' ').slice(1).join(' ') : '') || '';
            customerObj = {
                first_name: firstName,
                last_name: lastName,
                company_name: customerProfile.company_name || '',
                email: customerProfile.email || '',
                phone: customerProfile.phone || ''
            };
        }
        
        // Build destination object
        const destinationObj = destination ? {
            city_name: destination.city_name || '',
            country_name: destination.country_name || ''
        } : null;
        
        return {
            ...shipmentData,
            items_count: items.length,
            total_weight: shipment.total_weight || 0,
            total_declared_value: shipment.total_declared_value || 0,
            latest_tracking: trackingEntries[0] || null,
            customer: customerObj,
            destination: destinationObj
        };
    }));

    // Apply search filter if provided
    let filteredShipments = enrichedShipments;
    if (search) {
        const searchLower = search.toLowerCase();
        filteredShipments = enrichedShipments.filter((shipment: any) => {
            const trackingMatch = shipment.tracking_number?.toLowerCase().includes(searchLower);
            const customerMatch = 
                shipment.customer?.contact_person?.toLowerCase().includes(searchLower) ||
                shipment.customer?.first_name?.toLowerCase().includes(searchLower) ||
                shipment.customer?.last_name?.toLowerCase().includes(searchLower) ||
                shipment.customer?.company_name?.toLowerCase().includes(searchLower) ||
                shipment.customer?.phone?.toLowerCase().includes(searchLower) ||
                shipment.customer?.email?.toLowerCase().includes(searchLower);
            return trackingMatch || customerMatch;
        });
    }

    // Get total count for pagination
    const countResponse = await fetch(
        `${supabaseUrl}/rest/v1/shipments?select=id${filterQuery}`,
        {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Prefer': 'count=exact'
            }
        }
    );
    const total = countResponse.headers.get('content-range')?.split('/')[1] || filteredShipments.length;

    return new Response(JSON.stringify({
        data: {
            shipments: filteredShipments,
            pagination: {
                total: parseInt(total as string),
                limit,
                offset,
                has_more: offset + limit < parseInt(total as string)
            }
        }
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Handle getting a single shipment with full details
async function handleGetShipment(supabaseUrl: string, serviceRoleKey: string, shipmentId: string) {
    if (!shipmentId) {
        throw new Error('Shipment ID is required');
    }

    const shipmentResponse = await fetch(
        `${supabaseUrl}/rest/v1/shipments?id=eq.${shipmentId}&select=*,destinations!destination_id(*)`,
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

    const shipments = await shipmentResponse.json();
    if (shipments.length === 0) {
        throw new Error('Shipment not found');
    }

    const shipment = shipments[0];

    // Fetch customer profile separately
    let customerProfile = null;
    if (shipment.customer_id) {
        try {
            const profileResponse = await fetch(
                `${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${shipment.customer_id}&select=*`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );
            if (profileResponse.ok) {
                const profiles = await profileResponse.json();
                customerProfile = profiles[0] || null;
            } else {
                const errorText = await profileResponse.text();
                console.warn('Failed to fetch customer profile:', errorText);
            }
        } catch (error) {
            console.warn('Failed to fetch customer profile:', error);
        }
    }

    // Extract destination data (destinations join)
    const destination = shipment.destinations ? (Array.isArray(shipment.destinations) ? shipment.destinations[0] : shipment.destinations) : null;
    
    // Remove raw destinations from shipment
    const { destinations: _, user_profiles: __, ...shipmentData } = shipment;

    // Fetch related data
    const [items, tracking, documents] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/shipment_items?shipment_id=eq.${shipmentId}`, {
            headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey }
        }).then(r => r.ok ? r.json() : []),
        fetch(`${supabaseUrl}/rest/v1/shipment_tracking?shipment_id=eq.${shipmentId}&order=timestamp.desc`, {
            headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey }
        }).then(r => r.ok ? r.json() : []),
        fetch(`${supabaseUrl}/rest/v1/shipment_documents?shipment_id=eq.${shipmentId}`, {
            headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey }
        }).then(r => r.ok ? r.json() : [])
    ]);

    return new Response(JSON.stringify({
        data: {
            shipment: {
                ...shipmentData,
                items,
                tracking,
                documents,
                // Map user_profiles to customer for frontend compatibility
                customer: customerProfile ? {
                    first_name: customerProfile.first_name || customerProfile.contact_person?.split(' ')[0] || '',
                    last_name: customerProfile.last_name || customerProfile.contact_person?.split(' ').slice(1).join(' ') || '',
                    company_name: customerProfile.company_name || '',
                    email: customerProfile.email || '',
                    phone: customerProfile.phone || ''
                } : null,
                // Map destinations to destination (singular) for frontend compatibility
                destination: destination ? {
                    country_name: destination.country_name || '',
                    city_name: destination.city_name || ''
                } : null
            }
        }
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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

    // Send email notification to customer for important status changes
    const statusLabels: Record<string, string> = {
        'picked_up': 'Picked Up',
        'processing': 'Processing',
        'in_transit': 'In Transit',
        'customs_clearance': 'Customs Clearance',
        'out_for_delivery': 'Out for Delivery',
        'delivered': 'Delivered',
        'exception': 'Exception',
        'cancelled': 'Cancelled'
    };

    const importantStatuses = ['delivered', 'out_for_delivery', 'in_transit', 'exception', 'cancelled'];
    
    if (importantStatuses.includes(status)) {
        try {
            // Get shipment details with customer info
            const shipmentResponse = await fetch(
                `${supabaseUrl}/rest/v1/shipments?id=eq.${shipment_id}&select=*,customer_id`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );
            
            if (shipmentResponse.ok) {
                const shipments = await shipmentResponse.json();
                if (shipments.length > 0 && shipments[0].customer_id) {
                    // Get customer email from user_profiles
                    const profileResponse = await fetch(
                        `${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${shipments[0].customer_id}&select=email`,
                        {
                            headers: {
                                'Authorization': `Bearer ${serviceRoleKey}`,
                                'apikey': serviceRoleKey
                            }
                        }
                    );
                    
                    if (profileResponse.ok) {
                        const profiles = await profileResponse.json();
                        if (profiles.length > 0 && profiles[0].email) {
                            const resendApiKey = Deno.env.get('RESEND_API_KEY');
                            const statusLabel = statusLabels[status] || status;
                            
                            const emailHtml = generateNotificationEmail({
                                title: `Shipment Status Update: ${statusLabel}`,
                                message: `Your shipment ${shipments[0].tracking_number || shipment_id} status has been updated to ${statusLabel}.${notes ? ` ${notes}` : ''}`,
                                actionText: 'View Shipment Details',
                                actionUrl: `https://www.qcs-cargo.com/dashboard/shipments/${shipment_id}`,
                                details: [
                                    { label: 'Tracking Number', value: shipments[0].tracking_number || shipment_id },
                                    { label: 'Status', value: statusLabel },
                                    { label: 'Updated', value: new Date().toLocaleString('en-US') }
                                ],
                                footerNote: status === 'delivered' ? 'Thank you for choosing QCS Cargo!' : undefined
                            });

                            await sendEmail(resendApiKey, {
                                to: profiles[0].email,
                                subject: `Shipment ${shipments[0].tracking_number || shipment_id} - ${statusLabel}`,
                                html: emailHtml,
                                tags: [
                                    { name: 'notification_type', value: 'shipment_status_update' },
                                    { name: 'shipment_id', value: String(shipment_id) },
                                    { name: 'status', value: status }
                                ]
                            });
                        }
                    }
                }
            }
        } catch (emailError) {
            console.warn('Failed to send shipment status email:', emailError);
            // Don't fail the status update if email fails
        }
    }

    const result = {
        success: true,
        message: 'Shipment status updated successfully'
    };

    return new Response(JSON.stringify({ data: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Helper function to send shipment status email
async function sendShipmentStatusEmail(
    supabaseUrl: string,
    serviceRoleKey: string,
    resendApiKey: string | undefined,
    shipmentId: string,
    status: string,
    statusLabel: string,
    trackingNumber: string,
    notes?: string
) {
    if (!resendApiKey) return;
    
    try {
        // Get shipment and customer info
        const shipmentResponse = await fetch(
            `${supabaseUrl}/rest/v1/shipments?id=eq.${shipmentId}&select=*,customer_id`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );
        
        if (!shipmentResponse.ok) return;
        
        const shipments = await shipmentResponse.json();
        if (!shipments.length || !shipments[0].customer_id) return;
        
        // Get customer email
        const profileResponse = await fetch(
            `${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${shipments[0].customer_id}&select=email`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );
        
        if (!profileResponse.ok) return;
        
        const profiles = await profileResponse.json();
        if (!profiles.length || !profiles[0].email) return;
        
        const emailHtml = generateNotificationEmail({
            title: `Shipment Status Update: ${statusLabel}`,
            message: `Your shipment ${trackingNumber || shipmentId} status has been updated to ${statusLabel}.${notes ? ` ${notes}` : ''}`,
            actionText: 'View Shipment Details',
            actionUrl: `https://www.qcs-cargo.com/dashboard/shipments/${shipmentId}`,
            details: [
                { label: 'Tracking Number', value: trackingNumber || shipmentId },
                { label: 'Status', value: statusLabel },
                { label: 'Updated', value: new Date().toLocaleString('en-US') }
            ],
            footerNote: status === 'delivered' ? 'Thank you for choosing QCS Cargo!' : undefined
        });

        await sendEmail(resendApiKey, {
            to: profiles[0].email,
            subject: `Shipment ${trackingNumber || shipmentId} - ${statusLabel}`,
            html: emailHtml,
            tags: [
                { name: 'notification_type', value: 'shipment_status_update' },
                { name: 'shipment_id', value: String(shipmentId) },
                { name: 'status', value: status }
            ]
        });
    } catch (error) {
        console.warn(`Failed to send email for shipment ${shipmentId}:`, error);
    }
}

// Handle bulk status updates
async function handleBulkUpdateStatus(supabaseUrl: string, serviceRoleKey: string, requestData: any, userId: string) {
    const { shipment_ids, status, notes } = requestData;

    if (!shipment_ids || !Array.isArray(shipment_ids) || shipment_ids.length === 0) {
        throw new Error('Shipment IDs array is required');
    }

    if (!status) {
        throw new Error('Status is required');
    }

    const updatedShipments = [];
    const errors = [];

    // Update each shipment
    for (const shipmentId of shipment_ids) {
        try {
            // Update shipment status
            const updateResponse = await fetch(
                `${supabaseUrl}/rest/v1/shipments?id=eq.${shipmentId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        status, 
                        updated_at: new Date().toISOString() 
                    })
                }
            );

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                errors.push({ shipment_id: shipmentId, error: errorText });
                continue;
            }

            // Add tracking entry
            const trackingData = {
                shipment_id: parseInt(shipmentId),
                status,
                location: 'QCS Cargo Facility',
                notes: notes || `Bulk status update to ${status}`,
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

            updatedShipments.push(shipmentId);

            // Send email notification for important status changes
            const importantStatuses = ['delivered', 'out_for_delivery', 'in_transit', 'exception', 'cancelled'];
            if (importantStatuses.includes(status)) {
                const statusLabels: Record<string, string> = {
                    'delivered': 'Delivered',
                    'out_for_delivery': 'Out for Delivery',
                    'in_transit': 'In Transit',
                    'exception': 'Exception',
                    'cancelled': 'Cancelled'
                };
                
                // Get shipment tracking number
                const shipmentInfoResponse = await fetch(
                    `${supabaseUrl}/rest/v1/shipments?id=eq.${shipmentId}&select=tracking_number`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );
                
                let trackingNumber = shipmentId;
                if (shipmentInfoResponse.ok) {
                    const shipmentInfo = await shipmentInfoResponse.json();
                    if (shipmentInfo.length > 0 && shipmentInfo[0].tracking_number) {
                        trackingNumber = shipmentInfo[0].tracking_number;
                    }
                }
                
                const resendApiKey = Deno.env.get('RESEND_API_KEY');
                await sendShipmentStatusEmail(
                    supabaseUrl,
                    serviceRoleKey,
                    resendApiKey,
                    shipmentId,
                    status,
                    statusLabels[status] || status,
                    trackingNumber,
                    notes
                );
            }
        } catch (error) {
            errors.push({ 
                shipment_id: shipmentId, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            });
        }
    }

    return new Response(JSON.stringify({
        data: {
            success: true,
            updated_count: updatedShipments.length,
            total_count: shipment_ids.length,
            updated_shipments: updatedShipments,
            errors: errors.length > 0 ? errors : undefined
        }
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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

    const tracking = await trackingResponse.json();

    return new Response(JSON.stringify({ data: tracking }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Handle getting shipment statistics
async function handleGetStats(supabaseUrl: string, serviceRoleKey: string) {
    // Get all shipments for status breakdown
    const shipmentsResponse = await fetch(
        `${supabaseUrl}/rest/v1/shipments?select=status,created_at`,
        {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        }
    );

    if (!shipmentsResponse.ok) {
        throw new Error('Failed to fetch shipment stats');
    }

    const shipments = await shipmentsResponse.json();

    // Calculate stats
    const statusBreakdown: Record<string, number> = {};
    let recentShipments7Days = 0;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    shipments.forEach((shipment: any) => {
        const status = shipment.status || 'pending_pickup';
        statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;

        const createdAt = new Date(shipment.created_at);
        if (createdAt >= sevenDaysAgo) {
            recentShipments7Days++;
        }
    });

    return new Response(JSON.stringify({
        data: {
            stats: {
                status_breakdown: statusBreakdown,
                recent_shipments_7_days: recentShipments7Days,
                total_shipments: shipments.length
            }
        }
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}
