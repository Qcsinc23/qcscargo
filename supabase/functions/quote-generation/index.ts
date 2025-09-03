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
        const quoteId = url.pathname.split('/').pop();

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
            // Generate new quote
            const requestData = await req.json();
            const {
                destination_id,
                service_type = 'standard',
                items,
                special_requirements,
                pickup_required = false,
                insurance_required = false,
                declared_total_value
            } = requestData;

            if (!destination_id || !items || items.length === 0) {
                throw new Error('Destination and items are required');
            }

            // Get destination details for rate calculation
            const destResponse = await fetch(`${supabaseUrl}/rest/v1/destinations?id=eq.${destination_id}`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            if (!destResponse.ok) {
                throw new Error('Failed to get destination information');
            }

            const destinations = await destResponse.json();
            if (destinations.length === 0) {
                throw new Error('Destination not found');
            }

            const destination = destinations[0];

            // Calculate total weight and dimensions
            const totalWeight = items.reduce((sum, item) => sum + (item.weight_lbs || 0), 0);
            const totalValue = declared_total_value || items.reduce((sum, item) => sum + (item.declared_value || 0), 0);

            // Determine rate based on weight tiers
            let ratePerLb;
            if (totalWeight <= 50) {
                ratePerLb = destination.rate_per_lb_1_50;
            } else if (totalWeight <= 100) {
                ratePerLb = destination.rate_per_lb_51_100;
            } else if (totalWeight <= 200) {
                ratePerLb = destination.rate_per_lb_101_200;
            } else {
                ratePerLb = destination.rate_per_lb_201_plus;
            }

            let baseCost = totalWeight * ratePerLb;

            // Additional services
            const additionalServices = {};
            let additionalCost = 0;

            // Express service surcharge
            if (service_type === 'express') {
                const expressSurcharge = baseCost * (destination.express_surcharge_percent / 100);
                additionalServices.express_service = expressSurcharge;
                additionalCost += expressSurcharge;
            }

            // Pickup service
            if (pickup_required) {
                additionalServices.pickup_service = 25.00;
                additionalCost += 25.00;
            }

            // Insurance
            let insuranceCost = 0;
            if (insurance_required && totalValue > 100) {
                insuranceCost = Math.max(15, ((totalValue - 100) / 100) * 7.50);
                additionalServices.insurance = insuranceCost;
                additionalCost += insuranceCost;
            }

            // Handling fees for oversized items
            const hasOversizedItems = items.some(item => 
                (item.weight_lbs && item.weight_lbs > 70) ||
                (item.length_inches && item.length_inches > 48) ||
                (item.width_inches && item.width_inches > 48) ||
                (item.height_inches && item.height_inches > 48)
            );

            if (hasOversizedItems) {
                additionalServices.oversized_handling = 20.00;
                additionalCost += 20.00;
            }

            const totalCost = baseCost + additionalCost;
            const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

            // Create quote record
            const quoteData = {
                customer_id: userId,
                shipment_data: {
                    destination_id,
                    service_type,
                    items,
                    total_weight: totalWeight,
                    total_declared_value: totalValue,
                    special_requirements,
                    pickup_required,
                    insurance_required
                },
                base_cost: baseCost,
                additional_services: additionalServices,
                total_cost: totalCost,
                status: 'active',
                created_by: userId,
                valid_until: validUntil.toISOString(),
                created_at: new Date().toISOString()
            };

            const quoteResponse = await fetch(`${supabaseUrl}/rest/v1/quotes`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(quoteData)
            });

            if (!quoteResponse.ok) {
                const errorText = await quoteResponse.text();
                throw new Error(`Quote creation failed: ${errorText}`);
            }

            const savedQuote = await quoteResponse.json();

            // Create notification for customer
            const notificationData = {
                user_id: userId,
                notification_type: 'quote_generated',
                title: 'Shipping Quote Ready',
                message: `Your shipping quote #${savedQuote[0].id} is ready. Total cost: $${totalCost.toFixed(2)}`,
                data: { quote_id: savedQuote[0].id, total_cost: totalCost },
                priority: 'normal',
                action_url: `/quotes/${savedQuote[0].id}`
            };

            await fetch(`${supabaseUrl}/rest/v1/notifications`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(notificationData)
            });

            const result = {
                success: true,
                quote: {
                    id: savedQuote[0].id,
                    destination: destination,
                    service_type,
                    total_weight: totalWeight,
                    total_declared_value: totalValue,
                    base_cost: baseCost,
                    additional_services: additionalServices,
                    total_cost: totalCost,
                    valid_until: validUntil.toISOString(),
                    rate_breakdown: {
                        rate_per_lb: ratePerLb,
                        base_shipping_cost: baseCost,
                        additional_services_cost: additionalCost,
                        insurance_cost: insuranceCost,
                        total_cost: totalCost
                    }
                },
                message: 'Quote generated successfully'
            };

            return new Response(JSON.stringify({ data: result }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (method === 'GET') {
            if (!quoteId || quoteId === 'quote-generation') {
                // Return customer's quotes
                const quotesResponse = await fetch(
                    `${supabaseUrl}/rest/v1/quotes?customer_id=eq.${userId}&order=created_at.desc`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );

                if (!quotesResponse.ok) {
                    throw new Error('Failed to fetch quotes');
                }

                const quotes = await quotesResponse.json();

                return new Response(JSON.stringify({ data: quotes }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            } else {
                // Return specific quote
                const quoteResponse = await fetch(
                    `${supabaseUrl}/rest/v1/quotes?id=eq.${quoteId}&customer_id=eq.${userId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );

                if (!quoteResponse.ok) {
                    throw new Error('Failed to fetch quote');
                }

                const quoteData = await quoteResponse.json();

                if (quoteData.length === 0) {
                    throw new Error('Quote not found or access denied');
                }

                return new Response(JSON.stringify({ data: quoteData[0] }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

        } else if (method === 'PATCH') {
            // Accept quote and convert to shipment
            const requestData = await req.json();
            const { action } = requestData;

            if (action === 'accept') {
                // Get quote details
                const quoteResponse = await fetch(
                    `${supabaseUrl}/rest/v1/quotes?id=eq.${quoteId}&customer_id=eq.${userId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );

                if (!quoteResponse.ok) {
                    throw new Error('Quote not found');
                }

                const quotes = await quoteResponse.json();
                if (quotes.length === 0) {
                    throw new Error('Quote not found or access denied');
                }

                const quote = quotes[0];

                // Check if quote is still valid
                const now = new Date();
                const validUntil = new Date(quote.valid_until);
                if (now > validUntil) {
                    throw new Error('Quote has expired');
                }

                // Update quote status
                await fetch(
                    `${supabaseUrl}/rest/v1/quotes?id=eq.${quoteId}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            status: 'accepted',
                            updated_at: new Date().toISOString()
                        })
                    }
                );

                const result = {
                    success: true,
                    quote_id: quoteId,
                    message: 'Quote accepted successfully. Please proceed with shipment creation.'
                };

                return new Response(JSON.stringify({ data: result }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

    } catch (error) {
        console.error('Quote generation error:', error);

        const errorResponse = {
            error: {
                code: 'QUOTE_OPERATION_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});