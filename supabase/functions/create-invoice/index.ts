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
        // Extract invoice data from request body
        const requestData = await req.json();
        const {
            shipment_id,
            invoice_type, // 'quote' or 'final'
            line_items, // Array of custom line items
            discount_amount,
            notes,
            due_date
        } = requestData;

        // Validate required fields
        if (!shipment_id) {
            throw new Error('Missing required field: shipment_id');
        }

        // Get Supabase configuration
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        // Get user from auth header
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('No authorization header provided');
        }

        const token = authHeader.replace('Bearer ', '');

        // Verify token and get user
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

        // Verify user has admin/staff permissions
        const profileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${userId}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (!profileResponse.ok) {
            throw new Error('Failed to verify user permissions');
        }

        const profiles = await profileResponse.json();
        if (profiles.length === 0 || !['admin', 'staff', 'manager'].includes(profiles[0].role)) {
            throw new Error('Access denied: insufficient permissions to create invoices');
        }

        // Fetch shipment details
        const shipmentResponse = await fetch(
            `${supabaseUrl}/rest/v1/shipments?id=eq.${shipment_id}&select=*,destinations(country,rates_per_lb)`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );

        if (!shipmentResponse.ok) {
            throw new Error('Failed to fetch shipment data');
        }

        const shipmentData = await shipmentResponse.json();
        if (shipmentData.length === 0) {
            throw new Error('Shipment not found');
        }

        const shipment = shipmentData[0];

        // Fetch customer details
        const customerResponse = await fetch(
            `${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${shipment.customer_id}`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );

        if (!customerResponse.ok) {
            throw new Error('Failed to fetch customer data');
        }

        const customerData = await customerResponse.json();
        if (customerData.length === 0) {
            throw new Error('Customer not found');
        }

        const customer = customerData[0];

        // Fetch shipment items for line items calculation
        const itemsResponse = await fetch(
            `${supabaseUrl}/rest/v1/shipment_items?shipment_id=eq.${shipment_id}`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );

        let items = [];
        if (itemsResponse.ok) {
            items = await itemsResponse.json();
        }

        // Generate invoice number
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const timestamp = now.getTime().toString().slice(-6);
        const invoiceNumber = `QCS-${year}${month}${day}-${timestamp}`;

        // Calculate line items if not provided
        let calculatedLineItems = [];
        
        if (line_items && line_items.length > 0) {
            // Use provided line items
            calculatedLineItems = line_items;
        } else {
            // Generate line items from shipment data
            const destination = shipment.destinations;
            const ratePerLb = destination ? destination.rates_per_lb : 5.0; // fallback rate
            
            // Shipping charge based on weight
            const shippingCharge = {
                description: `Air Cargo Shipping to ${destination?.country || 'Caribbean'}`,
                quantity: parseFloat(shipment.total_weight) || 0,
                unit_price: ratePerLb,
                amount: (parseFloat(shipment.total_weight) || 0) * ratePerLb
            };
            calculatedLineItems.push(shippingCharge);

            // Service level surcharge if premium
            if (shipment.service_level === 'express') {
                const expressCharge = {
                    description: 'Express Service Surcharge',
                    quantity: 1,
                    unit_price: 25.0,
                    amount: 25.0
                };
                calculatedLineItems.push(expressCharge);
            }

            // Insurance if declared value exists
            if (shipment.declared_value && parseFloat(shipment.declared_value) > 0) {
                const insuranceRate = 0.02; // 2% of declared value
                const insuranceCharge = {
                    description: 'Cargo Insurance',
                    quantity: 1,
                    unit_price: parseFloat(shipment.declared_value) * insuranceRate,
                    amount: parseFloat(shipment.declared_value) * insuranceRate
                };
                calculatedLineItems.push(insuranceCharge);
            }
        }

        // Calculate totals
        const subtotal = calculatedLineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
        const discountAmount = parseFloat(discount_amount) || 0;
        const taxRate = 0.0; // Adjust based on business requirements
        const taxAmount = (subtotal - discountAmount) * taxRate;
        const totalAmount = subtotal - discountAmount + taxAmount;

        // Create invoice record
        const invoiceData = {
            invoice_number: invoiceNumber,
            shipment_id,
            customer_id: shipment.customer_id,
            invoice_type: invoice_type || 'final',
            status: 'pending',
            subtotal,
            discount_amount: discountAmount,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            line_items: JSON.stringify(calculatedLineItems),
            notes: notes || '',
            due_date: due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
            created_by: userId,
            created_at: now.toISOString()
        };

        const invoiceResponse = await fetch(`${supabaseUrl}/rest/v1/invoices`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(invoiceData)
        });

        if (!invoiceResponse.ok) {
            const errorText = await invoiceResponse.text();
            throw new Error(`Failed to create invoice: ${errorText}`);
        }

        const invoiceResult = await invoiceResponse.json();
        const invoice = invoiceResult[0];

        // Update shipment with estimated cost if this is a final invoice
        if (invoice_type === 'final') {
            const shipmentUpdateResponse = await fetch(`${supabaseUrl}/rest/v1/shipments?id=eq.${shipment_id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    estimated_cost: totalAmount,
                    updated_at: now.toISOString()
                })
            });

            if (!shipmentUpdateResponse.ok) {
                console.error('Failed to update shipment cost');
            }
        }

        // Create notification for customer
        const notificationData = {
            user_id: shipment.customer_id,
            recipient_type: 'customer',
            title: `New ${invoice_type === 'quote' ? 'Quote' : 'Invoice'} Available`,
            message: `${invoice_type === 'quote' ? 'Quote' : 'Invoice'} ${invoiceNumber} for shipment ${shipment_id.slice(0, 8)}... is now available`,
            reference_type: 'invoice',
            reference_id: invoice.id,
            priority: 'normal',
            created_at: now.toISOString()
        };

        const notificationResponse = await fetch(`${supabaseUrl}/rest/v1/notifications`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(notificationData)
        });

        if (!notificationResponse.ok) {
            console.error('Failed to create customer notification');
        }

        // Return success response
        const result = {
            success: true,
            invoice: {
                ...invoice,
                line_items: calculatedLineItems, // Return parsed line items
                customer: {
                    name: `${customer.first_name} ${customer.last_name}`,
                    email: customer.email,
                    company: customer.company_name,
                    address: customer.address
                },
                shipment: {
                    id: shipment.id,
                    destination: shipment.destinations?.country,
                    service_level: shipment.service_level,
                    total_weight: shipment.total_weight
                }
            },
            message: `${invoice_type === 'quote' ? 'Quote' : 'Invoice'} ${invoiceNumber} created successfully`
        };

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Create invoice error:', error);

        const errorResponse = {
            error: {
                code: 'INVOICE_CREATION_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});