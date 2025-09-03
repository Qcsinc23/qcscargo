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
        const { weight, dimensions, destinationId, serviceType = 'standard', declaredValue = 0 } = await req.json();

        if (!weight || weight <= 0) {
            throw new Error('Valid weight is required');
        }

        if (!destinationId) {
            throw new Error('Destination is required');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Get destination data
        const destResponse = await fetch(`${supabaseUrl}/rest/v1/destinations?id=eq.${destinationId}&select=*`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!destResponse.ok) {
            throw new Error('Failed to fetch destination data');
        }

        const destinations = await destResponse.json();
        if (!destinations || destinations.length === 0) {
            throw new Error('Destination not found');
        }

        const destination = destinations[0];

        // Calculate dimensional weight if dimensions provided
        let billableWeight = weight;
        let dimensionalWeight = null;
        
        if (dimensions && dimensions.length && dimensions.width && dimensions.height) {
            dimensionalWeight = (dimensions.length * dimensions.width * dimensions.height) / 166;
            billableWeight = Math.max(weight, dimensionalWeight);
        }

        // Determine rate based on weight tiers
        let ratePerLb;
        if (billableWeight <= 50) {
            ratePerLb = destination.rate_per_lb_1_50;
        } else if (billableWeight <= 100) {
            ratePerLb = destination.rate_per_lb_51_100;
        } else if (billableWeight <= 200) {
            ratePerLb = destination.rate_per_lb_101_200;
        } else {
            ratePerLb = destination.rate_per_lb_201_plus;
        }

        let baseShippingCost = billableWeight * ratePerLb;

        // Apply express surcharge if needed
        let expressSurcharge = 0;
        if (serviceType === 'express') {
            expressSurcharge = baseShippingCost * (destination.express_surcharge_percent / 100);
            baseShippingCost += expressSurcharge;
        }

        // Calculate additional fees
        const consolidationFee = 0; // Will be added manually by user
        const handlingFee = billableWeight > 70 ? 20 : 0;
        
        // Calculate insurance
        let insuranceCost = 0;
        if (declaredValue > 100) {
            insuranceCost = Math.max(15, ((declaredValue - 100) / 100) * 7.50);
        }

        const totalCost = baseShippingCost + consolidationFee + handlingFee + insuranceCost;

        // Calculate transit time
        let transitDaysMin = destination.transit_days_min;
        let transitDaysMax = destination.transit_days_max;
        
        if (serviceType === 'express') {
            transitDaysMin = Math.max(1, transitDaysMin - 1);
            transitDaysMax = Math.max(2, transitDaysMax - 1);
        }

        const result = {
            destination: {
                country: destination.country_name,
                city: destination.city_name
            },
            weight: {
                actual: weight,
                dimensional: dimensionalWeight,
                billable: billableWeight
            },
            serviceType,
            rateBreakdown: {
                ratePerLb,
                baseShippingCost: parseFloat(baseShippingCost.toFixed(2)),
                expressSurcharge: parseFloat(expressSurcharge.toFixed(2)),
                consolidationFee,
                handlingFee,
                insuranceCost: parseFloat(insuranceCost.toFixed(2)),
                totalCost: parseFloat(totalCost.toFixed(2))
            },
            transitTime: {
                min: transitDaysMin,
                max: transitDaysMax,
                estimate: `${transitDaysMin}-${transitDaysMax} business days`
            },
            declaredValue
        };

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Shipping calculation error:', error);

        const errorResponse = {
            error: {
                code: 'CALCULATION_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});