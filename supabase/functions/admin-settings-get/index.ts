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
            category = null,
            search_term = '',
            include_audit = false
        } = await req.json();

        console.log('Admin settings get request:', { category, search_term, include_audit });

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Get the authorization header to verify admin access
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Authorization header missing');
        }

        // Verify the user is authenticated and has admin privileges
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': authHeader,
                'apikey': serviceRoleKey
            }
        });

        if (!userResponse.ok) {
            throw new Error('Invalid authentication');
        }

        const user = await userResponse.json();
        
        // Check if user has admin role
        const profileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?select=role&user_id=eq.${user.id}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (!profileResponse.ok) {
            throw new Error('Failed to verify user profile');
        }

        const profiles = await profileResponse.json();
        if (!profiles.length || profiles[0].role !== 'admin') {
            throw new Error('Insufficient permissions - admin access required');
        }

        // Build query for settings
        let settingsQuery = 'select=*';
        const queryFilters: string[] = [];

        // Apply category filter if specified
        if (category && category !== 'all') {
            queryFilters.push(`category=eq.${category}`);
        }

        // Apply search filter if specified
        if (search_term && search_term.trim().length > 0) {
            const term = search_term.trim();
            const searchFilter = `or=(setting_key.ilike.*${term}*,display_name.ilike.*${term}*,description.ilike.*${term}*)`;
            queryFilters.push(searchFilter);
        }

        // Apply filters to query
        if (queryFilters.length > 0) {
            settingsQuery += '&' + queryFilters.join('&');
        }

        // Add ordering
        settingsQuery += '&order=category.asc,subcategory.asc,display_name.asc';

        console.log('Executing settings query:', settingsQuery);

        // Fetch settings from the database
        const settingsResponse = await fetch(`${supabaseUrl}/rest/v1/system_settings?${settingsQuery}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (!settingsResponse.ok) {
            const errorText = await settingsResponse.text();
            throw new Error(`Failed to fetch settings: ${errorText}`);
        }

        const settings = await settingsResponse.json();
        console.log(`Found ${settings.length} settings`);

        // Organize settings by category and subcategory
        const organizedSettings: Record<string, Record<string, any[]>> = {};
        
        settings.forEach((setting: any) => {
            const category = setting.category || 'General';
            const subcategory = setting.subcategory || 'General';
            
            if (!organizedSettings[category]) {
                organizedSettings[category] = {};
            }
            
            if (!organizedSettings[category][subcategory]) {
                organizedSettings[category][subcategory] = [];
            }
            
            organizedSettings[category][subcategory].push({
                id: setting.id,
                setting_key: setting.setting_key,
                setting_value: setting.setting_value,
                default_value: setting.default_value,
                display_name: setting.display_name,
                description: setting.description,
                input_type: setting.input_type || 'text',
                validation_rules: setting.validation_rules || {},
                is_public: setting.is_public || false,
                is_system_critical: setting.is_system_critical || false,
                affects_operations: setting.affects_operations || false,
                updated_at: setting.updated_at
            });
        });

        // Prepare response data
        const responseData: any = {
            settings: organizedSettings,
            total_count: settings.length
        };

        // Include audit trail if requested
        if (include_audit) {
            let auditQuery = 'select=*';
            const auditFilters: string[] = [];

            // Apply category filter to audit trail if specified
            if (category && category !== 'all') {
                auditFilters.push(`category=eq.${category}`);
            }

            // Apply filters to audit query
            if (auditFilters.length > 0) {
                auditQuery += '&' + auditFilters.join('&');
            }

            // Add ordering for audit trail (most recent first)
            auditQuery += '&order=created_at.desc&limit=100';

            console.log('Executing audit query:', auditQuery);

            const auditResponse = await fetch(`${supabaseUrl}/rest/v1/settings_audit_log?${auditQuery}`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            if (auditResponse.ok) {
                const auditTrail = await auditResponse.json();
                responseData.audit_trail = auditTrail.map((entry: any) => ({
                    id: entry.id,
                    setting_key: entry.setting_key,
                    category: entry.category,
                    old_value: entry.old_value,
                    new_value: entry.new_value,
                    changed_by: entry.changed_by,
                    change_reason: entry.change_reason,
                    created_at: entry.created_at
                }));
            } else {
                console.warn('Failed to fetch audit trail, continuing without it');
                responseData.audit_trail = [];
            }
        }

        const result = {
            success: true,
            data: responseData,
            meta: {
                category_filter: category,
                search_term,
                include_audit,
                generated_at: new Date().toISOString()
            }
        };

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Admin settings get error:', error);

        const errorResponse = {
            error: {
                code: 'ADMIN_SETTINGS_GET_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});