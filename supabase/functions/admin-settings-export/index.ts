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
            format = 'json',
            include_audit_trail = false,
            categories = [],
            include_sensitive = false
        } = await req.json();

        console.log('Admin settings export request:', { format, include_audit_trail, categories, include_sensitive });

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

        // Build query for settings based on categories filter
        let settingsQuery = `${supabaseUrl}/rest/v1/system_settings?select=*`;
        if (categories.length > 0) {
            const categoryFilter = categories.map(cat => `category.eq.${cat}`).join(',');
            settingsQuery += `&or=(${categoryFilter})`;
        }

        // Fetch settings
        const settingsResponse = await fetch(settingsQuery, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (!settingsResponse.ok) {
            throw new Error('Failed to fetch settings');
        }

        let settings = await settingsResponse.json();

        // Filter out sensitive settings if not requested
        if (!include_sensitive) {
            settings = settings.filter(setting => !setting.is_sensitive);
        }

        // Prepare export data
        const exportData = {
            export_info: {
                exported_at: new Date().toISOString(),
                exported_by: user.email,
                format: format,
                total_settings: settings.length,
                categories_included: categories.length > 0 ? categories : 'all',
                includes_sensitive: include_sensitive,
                includes_audit_trail: include_audit_trail
            },
            settings: settings.map(setting => ({
                id: setting.id,
                setting_key: setting.setting_key,
                category: setting.category,
                setting_value: setting.setting_value,
                default_value: setting.default_value,
                description: setting.description,
                data_type: setting.data_type,
                is_system_critical: setting.is_system_critical,
                is_sensitive: setting.is_sensitive,
                validation_rules: setting.validation_rules,
                created_at: setting.created_at,
                updated_at: setting.updated_at
            }))
        };

        // Include audit trail if requested
        if (include_audit_trail) {
            const auditResponse = await fetch(`${supabaseUrl}/rest/v1/settings_audit_log?select=*&order=created_at.desc`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            if (auditResponse.ok) {
                const auditData = await auditResponse.json();
                exportData.audit_trail = auditData;
            } else {
                console.warn('Failed to fetch audit trail data');
                exportData.audit_trail = [];
            }
        }

        // Format response based on requested format
        let responseContent;
        let contentType;
        let filename;

        switch (format.toLowerCase()) {
            case 'csv':
                // Convert settings to CSV format
                const csvHeaders = ['ID', 'Key', 'Category', 'Value', 'Default Value', 'Description', 'Type', 'Critical', 'Sensitive', 'Created', 'Updated'];
                const csvRows = settings.map(setting => [
                    setting.id,
                    setting.setting_key,
                    setting.category,
                    JSON.stringify(setting.setting_value),
                    JSON.stringify(setting.default_value),
                    setting.description?.replace(/"/g, '""') || '',
                    setting.data_type,
                    setting.is_system_critical,
                    setting.is_sensitive,
                    setting.created_at,
                    setting.updated_at
                ]);
                
                responseContent = [csvHeaders, ...csvRows]
                    .map(row => row.map(cell => `"${cell}"`).join(','))
                    .join('\n');
                contentType = 'text/csv';
                filename = `admin-settings-export-${new Date().toISOString().split('T')[0]}.csv`;
                break;

            case 'xml':
                // Convert to XML format
                const xmlSettings = settings.map(setting => 
                    `    <setting>
        <id>${setting.id}</id>
        <key>${setting.setting_key}</key>
        <category>${setting.category}</category>
        <value><![CDATA[${JSON.stringify(setting.setting_value)}]]></value>
        <default_value><![CDATA[${JSON.stringify(setting.default_value)}]]></default_value>
        <description><![CDATA[${setting.description || ''}]]></description>
        <data_type>${setting.data_type}</data_type>
        <is_system_critical>${setting.is_system_critical}</is_system_critical>
        <is_sensitive>${setting.is_sensitive}</is_sensitive>
        <created_at>${setting.created_at}</created_at>
        <updated_at>${setting.updated_at}</updated_at>
    </setting>`
                ).join('\n');

                responseContent = `<?xml version="1.0" encoding="UTF-8"?>
<admin_settings_export>
    <export_info>
        <exported_at>${exportData.export_info.exported_at}</exported_at>
        <exported_by>${exportData.export_info.exported_by}</exported_by>
        <total_settings>${exportData.export_info.total_settings}</total_settings>
    </export_info>
    <settings>
${xmlSettings}
    </settings>
</admin_settings_export>`;
                contentType = 'application/xml';
                filename = `admin-settings-export-${new Date().toISOString().split('T')[0]}.xml`;
                break;

            default: // JSON
                responseContent = JSON.stringify(exportData, null, 2);
                contentType = 'application/json';
                filename = `admin-settings-export-${new Date().toISOString().split('T')[0]}.json`;
                break;
        }

        const result = {
            success: true,
            data: {
                filename,
                content: responseContent,
                size: new Blob([responseContent]).size,
                format: format,
                settings_count: settings.length
            },
            message: 'Settings exported successfully'
        };

        return new Response(JSON.stringify(result), {
            headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        });

    } catch (error) {
        console.error('Admin settings export error:', error);

        const errorResponse = {
            error: {
                code: 'ADMIN_SETTINGS_EXPORT_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});