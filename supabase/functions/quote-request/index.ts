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
            customerInfo, 
            destinationId, 
            weight, 
            dimensions, 
            serviceType = 'standard', 
            declaredValue = 0,
            rateBreakdown,
            specialInstructions 
        } = await req.json();

        // Validate required fields
        if (!customerInfo || !customerInfo.email || !customerInfo.fullName) {
            throw new Error('Customer name and email are required');
        }

        if (!destinationId || !weight || !rateBreakdown) {
            throw new Error('Destination, weight, and rate breakdown are required');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Get customer ID from auth if logged in
        let customerId = null;
        const authHeader = req.headers.get('authorization');
        if (authHeader) {
            try {
                const token = authHeader.replace('Bearer ', '');
                const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'apikey': serviceRoleKey
                    }
                });
                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    customerId = userData.id;
                }
            } catch (error) {
                console.log('Could not get user from token:', error.message);
            }
        }

        // Set quote expiration (30 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        // Calculate estimated transit days from destination
        const destResponse = await fetch(`${supabaseUrl}/rest/v1/destinations?id=eq.${destinationId}&select=transit_days_min,transit_days_max`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        let estimatedTransitDays = null;
        if (destResponse.ok) {
            const destinations = await destResponse.json();
            if (destinations && destinations.length > 0) {
                const dest = destinations[0];
                const minDays = serviceType === 'express' ? Math.max(1, dest.transit_days_min - 1) : dest.transit_days_min;
                const maxDays = serviceType === 'express' ? Math.max(2, dest.transit_days_max - 1) : dest.transit_days_max;
                estimatedTransitDays = Math.round((minDays + maxDays) / 2);
            }
        }

        // Save quote request
        const quoteData = {
            customer_id: customerId,
            email: customerInfo.email,
            full_name: customerInfo.fullName,
            phone: customerInfo.phone || null,
            destination_id: destinationId,
            weight_lbs: weight,
            length_inches: dimensions?.length || null,
            width_inches: dimensions?.width || null,
            height_inches: dimensions?.height || null,
            service_type: serviceType,
            declared_value: declaredValue,
            base_shipping_cost: rateBreakdown.baseShippingCost,
            consolidation_fee: rateBreakdown.consolidationFee || 0,
            handling_fee: rateBreakdown.handlingFee || 0,
            insurance_cost: rateBreakdown.insuranceCost || 0,
            total_cost: rateBreakdown.totalCost,
            estimated_transit_days: estimatedTransitDays,
            special_instructions: specialInstructions || null,
            status: 'pending',
            quote_expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString()
        };

        const quoteResponse = await fetch(`${supabaseUrl}/rest/v1/shipping_quotes`, {
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
            throw new Error(`Failed to save quote: ${errorText}`);
        }

        const savedQuote = await quoteResponse.json();

        const result = {
            success: true,
            message: 'Quote request saved successfully. We will contact you within 24 hours to confirm details.',
            quoteId: savedQuote[0].id,
            expiresAt: savedQuote[0].quote_expires_at,
            totalCost: savedQuote[0].total_cost,
            estimatedTransitDays: savedQuote[0].estimated_transit_days
        };

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Quote request error:', error);

        const errorResponse = {
            error: {
                code: 'QUOTE_REQUEST_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});