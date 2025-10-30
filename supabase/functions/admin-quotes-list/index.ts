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

        // CRITICAL SECURITY: Verify admin authentication
        const authHeader = req.headers.get('authorization');
        const authResult = await verifyAdminAccess(authHeader, supabaseUrl, serviceRoleKey);

        if (!authResult.success) {
            return createErrorResponse('UNAUTHORIZED', authResult.error || 'Admin access required', 401);
        }

        // Log admin action for audit trail
        logAdminAction('QUOTES_LIST_ACCESS', authResult.user!, {
            method: req.method,
            url: req.url
        });

        console.log(`Admin quotes list access granted to: ${authResult.user!.email}`);

        // Fetch all shipping quotes using service role (bypasses RLS)
        const quotesResponse = await fetch(
            `${supabaseUrl}/rest/v1/shipping_quotes?select=*&order=created_at.desc`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );

        if (!quotesResponse.ok) {
            const errorText = await quotesResponse.text();
            console.error('Failed to fetch quotes:', errorText);
            throw new Error(`Failed to fetch quotes: ${errorText}`);
        }

        const quotes = await quotesResponse.json();

        console.log(`Successfully fetched ${quotes.length} quotes for admin ${authResult.user!.email}`);

        // Log successful data access
        logAdminAction('QUOTES_LIST_SUCCESS', authResult.user!, {
            quotes_returned: quotes.length
        });

        return createSuccessResponse({
            success: true,
            data: quotes,
            count: quotes.length
        });

    } catch (error) {
        console.error('Admin quotes list error:', error);
        return createErrorResponse('ADMIN_QUOTES_LIST_FAILED', error.message, 500);
    }
});
