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
            setting_id,
            reset_type = 'single',
            confirm_critical = false
        } = await req.json();

        console.log('Admin settings reset request:', { setting_id, reset_type, confirm_critical });

        if (!setting_id) {
            throw new Error('Setting ID is required');
        }

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

        // Get the current setting to check if it's critical and get default value
        const currentSettingResponse = await fetch(`${supabaseUrl}/rest/v1/system_settings?select=*&id=eq.${setting_id}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (!currentSettingResponse.ok) {
            throw new Error('Failed to fetch current setting');
        }

        const currentSettings = await currentSettingResponse.json();
        if (!currentSettings.length) {
            throw new Error('Setting not found');
        }

        const currentSetting = currentSettings[0];
        
        // Check if setting is system critical and confirmation is required
        if (currentSetting.is_system_critical && !confirm_critical) {
            throw new Error('This is a system critical setting. Confirmation required to reset.');
        }

        const oldValue = currentSetting.setting_value;
        const defaultValue = currentSetting.default_value;

        // Reset the setting to its default value
        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/system_settings?id=eq.${setting_id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                setting_value: defaultValue,
                updated_at: new Date().toISOString()
            })
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            throw new Error(`Failed to reset setting: ${errorText}`);
        }

        // Log the change in audit trail
        try {
            const auditLogResponse = await fetch(`${supabaseUrl}/rest/v1/settings_audit_log`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    setting_key: currentSetting.setting_key,
                    category: currentSetting.category,
                    old_value: oldValue,
                    new_value: defaultValue,
                    changed_by: user.email,
                    change_reason: `Reset to default value (${reset_type} reset)`,
                    created_at: new Date().toISOString()
                })
            });

            if (!auditLogResponse.ok) {
                console.warn('Failed to log audit trail, but setting was reset successfully');
            }
        } catch (auditError) {
            console.warn('Audit logging failed:', auditError);
        }

        const result = {
            success: true,
            data: {
                setting_id,
                old_value: oldValue,
                new_value: defaultValue,
                reset_type,
                updated_at: new Date().toISOString()
            },
            message: 'Setting reset to default value successfully'
        };

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Admin settings reset error:', error);

        const errorResponse = {
            error: {
                code: 'ADMIN_SETTINGS_RESET_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});