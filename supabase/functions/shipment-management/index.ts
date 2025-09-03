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
        const method = req.method;
        const url = new URL(req.url);
        const shipmentId = url.pathname.split('/').pop();

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Get user from auth header
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Authentication required');
        }

        const token = authHeader.replace('Bearer ', '');
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

        if (method === 'POST') {
            // Create new shipment
            const requestData = await req.json();
            const {
                destination_id,
                service_type = 'standard',
                origin_address,
                items,
                special_instructions,
                pickup_required = false,
                pickup_address
            } = requestData;

            if (!destination_id || !origin_address || !items || items.length === 0) {
                throw new Error('Destination, origin address, and items are required');
            }

            // Generate tracking number
            const trackingNumber = 'QCS' + Date.now().toString().slice(-6) + Math.random().toString(36).substr(2, 3).toUpperCase();

            // Calculate total weight and value
            const totalWeight = items.reduce((sum, item) => sum + (item.weight_lbs || 0), 0);
            const totalValue = items.reduce((sum, item) => sum + (item.declared_value || 0), 0);

            // Create shipment record
            const shipmentData = {
                customer_id: userId,
                tracking_number: trackingNumber,
                status: 'requested',
                service_type,
                origin_address,
                destination_id,
                total_weight: totalWeight,
                total_declared_value: totalValue,
                special_instructions,
                priority: 'normal',
                created_at: new Date().toISOString()
            };

            const shipmentResponse = await fetch(`${supabaseUrl}/rest/v1/shipments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(shipmentData)
            });

            if (!shipmentResponse.ok) {
                const errorText = await shipmentResponse.text();
                throw new Error(`Shipment creation failed: ${errorText}`);
            }

            const savedShipment = await shipmentResponse.json();
            const newShipmentId = savedShipment[0].id;

            // Create shipment items
            const itemsData = items.map(item => ({
                shipment_id: newShipmentId,
                description: item.description,
                weight_lbs: item.weight_lbs,
                length_inches: item.length_inches || null,
                width_inches: item.width_inches || null,
                height_inches: item.height_inches || null,
                declared_value: item.declared_value,
                quantity: item.quantity || 1,
                category: item.category || null,
                origin_country: item.origin_country || 'United States'
            }));

            await fetch(`${supabaseUrl}/rest/v1/shipment_items`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(itemsData)
            });

            // Create initial tracking entry
            const trackingData = {
                shipment_id: newShipmentId,
                status: 'Shipment Requested',
                location: 'QCS Cargo System',
                timestamp: new Date().toISOString(),
                notes: 'Shipment request received and processing initiated',
                updated_by: userId,
                is_customer_visible: true
            };

            await fetch(`${supabaseUrl}/rest/v1/shipment_tracking`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(trackingData)
            });

            // Create tasks for staff
            const taskData = {
                task_type: 'review_shipment',
                title: 'Review New Shipment Request',
                description: `Review and process shipment ${trackingNumber}`,
                assigned_to: null, // Will be assigned to available staff
                related_shipment_id: newShipmentId,
                related_customer_id: userId,
                status: 'pending',
                priority: 'medium',
                due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
                created_by: userId
            };

            await fetch(`${supabaseUrl}/rest/v1/tasks`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });

            const result = {
                success: true,
                shipment: savedShipment[0],
                tracking_number: trackingNumber,
                message: 'Shipment request created successfully'
            };

            return new Response(JSON.stringify({ data: result }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (method === 'GET') {
            // Get shipment details
            if (!shipmentId || shipmentId === 'shipment-management') {
                // Return customer's shipments
                const shipmentsResponse = await fetch(
                    `${supabaseUrl}/rest/v1/shipments?customer_id=eq.${userId}&order=created_at.desc`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );

                if (!shipmentsResponse.ok) {
                    throw new Error('Failed to fetch shipments');
                }

                const shipments = await shipmentsResponse.json();

                return new Response(JSON.stringify({ data: shipments }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            } else {
                // Return specific shipment details
                const shipmentResponse = await fetch(
                    `${supabaseUrl}/rest/v1/shipments?id=eq.${shipmentId}&customer_id=eq.${userId}`,
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
                    throw new Error('Shipment not found or access denied');
                }

                // Get shipment items
                const itemsResponse = await fetch(
                    `${supabaseUrl}/rest/v1/shipment_items?shipment_id=eq.${shipmentId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );

                const items = itemsResponse.ok ? await itemsResponse.json() : [];

                // Get tracking history
                const trackingResponse = await fetch(
                    `${supabaseUrl}/rest/v1/shipment_tracking?shipment_id=eq.${shipmentId}&is_customer_visible=eq.true&order=timestamp.desc`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );

                const tracking = trackingResponse.ok ? await trackingResponse.json() : [];

                const result = {
                    shipment: shipmentData[0],
                    items,
                    tracking
                };

                return new Response(JSON.stringify({ data: result }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

        } else if (method === 'PATCH') {
            // Update shipment (limited fields for customers)
            const updateData = await req.json();
            const allowedUpdates = ['special_instructions', 'origin_address'];
            
            const filteredUpdates = {};
            for (const key of allowedUpdates) {
                if (updateData[key] !== undefined) {
                    filteredUpdates[key] = updateData[key];
                }
            }

            if (Object.keys(filteredUpdates).length === 0) {
                throw new Error('No valid update fields provided');
            }

            filteredUpdates.updated_at = new Date().toISOString();

            const updateResponse = await fetch(
                `${supabaseUrl}/rest/v1/shipments?id=eq.${shipmentId}&customer_id=eq.${userId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(filteredUpdates)
                }
            );

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                throw new Error(`Update failed: ${errorText}`);
            }

            const updatedShipment = await updateResponse.json();

            return new Response(JSON.stringify({ 
                data: { 
                    success: true, 
                    shipment: updatedShipment[0],
                    message: 'Shipment updated successfully' 
                } 
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

    } catch (error) {
        console.error('Shipment management error:', error);

        const errorResponse = {
            error: {
                code: 'SHIPMENT_OPERATION_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});