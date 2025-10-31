import { verifyAdminAccess, handleOptions, createErrorResponse, createSuccessResponse, logAdminAction } from '../_shared/auth-utils.ts';
import { corsHeaders } from '../_shared/cors-utils.ts';

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

        // Parse request body
        let requestData;
        try {
            requestData = await req.json();
        } catch (parseError) {
            console.error('Failed to parse request body:', parseError);
            return createErrorResponse('INVALID_REQUEST', 'Invalid JSON in request body', 400);
        }

        const { quote_id, status } = requestData;

        if (!quote_id || !status) {
            return createErrorResponse('VALIDATION_ERROR', 'Quote ID and status are required', 400);
        }

        // Ensure quote_id is a number (might come as string from frontend)
        const quoteId = typeof quote_id === 'string' ? parseInt(quote_id, 10) : quote_id;
        if (isNaN(quoteId)) {
            return createErrorResponse('VALIDATION_ERROR', 'Quote ID must be a valid number', 400);
        }

        // Validate status
        const validStatuses = ['pending', 'won', 'lost', 'expired', 'followup'];
        if (!validStatuses.includes(status)) {
            return createErrorResponse('VALIDATION_ERROR', `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
        }

        // Log admin action for audit trail
        logAdminAction('QUOTE_STATUS_UPDATE', authResult.user!, {
            quote_id: quoteId,
            new_status: status
        });

        console.log(`Admin ${authResult.user!.email} updating quote ${quoteId} to status: ${status}`);

        // Update quote status using service role (bypasses RLS)
        // Only update status field (don't include updated_at if it doesn't exist)
        const updateResponse = await fetch(
            `${supabaseUrl}/rest/v1/shipping_quotes?id=eq.${quoteId}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({ 
                    status
                })
            }
        );

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('Failed to update quote:', errorText);
            throw new Error(`Failed to update quote: ${errorText}`);
        }

        const updatedQuote = await updateResponse.json();
        console.log(`Successfully updated quote ${quoteId} to status: ${status}`);

        // Log successful update
        logAdminAction('QUOTE_STATUS_UPDATE_SUCCESS', authResult.user!, {
            quote_id: quoteId,
            status,
            quote_reference: updatedQuote[0]?.quote_reference
        });

        return createSuccessResponse({
            success: true,
            message: 'Quote status updated successfully',
            data: updatedQuote[0]
        });

    } catch (error) {
        console.error('Admin quote update error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An error occurred';
        console.error('Error details:', {
            message: errorMessage,
            stack: error instanceof Error ? error.stack : undefined
        });
        return createErrorResponse('QUOTE_UPDATE_FAILED', errorMessage, 500);
    }
});

