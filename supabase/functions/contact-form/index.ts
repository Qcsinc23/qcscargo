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
        const { fullName, email, phone, subject, message, inquiryType = 'general' } = await req.json();

        // Validate required fields
        if (!fullName || !email || !message) {
            throw new Error('Full name, email, and message are required');
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Please provide a valid email address');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Save contact inquiry to database
        const inquiryData = {
            full_name: fullName,
            email: email,
            phone: phone || null,
            subject: subject || 'General Inquiry',
            message: message,
            inquiry_type: inquiryType,
            status: 'new',
            created_at: new Date().toISOString()
        };

        const dbResponse = await fetch(`${supabaseUrl}/rest/v1/contact_inquiries`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(inquiryData)
        });

        if (!dbResponse.ok) {
            const errorText = await dbResponse.text();
            throw new Error(`Failed to save inquiry: ${errorText}`);
        }

        const savedInquiry = await dbResponse.json();

        // Here you could add email notification functionality
        // For now, we'll just return success

        const result = {
            success: true,
            message: 'Thank you for contacting QCS Cargo. We will respond within 24 hours.',
            inquiryId: savedInquiry[0].id,
            submittedAt: savedInquiry[0].created_at
        };

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Contact form submission error:', error);

        const errorResponse = {
            error: {
                code: 'SUBMISSION_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});