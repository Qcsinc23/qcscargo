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
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Get user from auth header
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Authorization header is required');
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
            throw new Error('Invalid token or unauthorized access');
        }

        const userData = await userResponse.json();
        const userId = userData.id;
        console.log('Fetching profile for user:', userId);

        // Fetch user profile using service role key (bypasses RLS)
        const profileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${userId}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!profileResponse.ok) {
            const errorText = await profileResponse.text();
            console.error('Failed to fetch profile:', errorText);
            throw new Error('Failed to fetch customer profile');
        }

        const profiles = await profileResponse.json();
        
        if (profiles.length === 0) {
            // No profile exists, return empty profile structure
            const emptyProfile = {
                user_id: userId,
                email: userData.email || '',
                first_name: '',
                last_name: '',
                company_name: '',
                contact_person: '',
                phone: '',
                phone_country_code: '+1',
                address_line1: '',
                address_line2: '',
                city: '',
                state: '',
                zip_code: '',
                postal_code: '',
                country: 'United States',
                region: '',
                district: '',
                business_type: '',
                tax_id: '',
                preferred_contact_method: 'email',
                emergency_contact: '',
                emergency_phone: '',
                profile_photo_url: null,
                profile_completion_percentage: 0,
                preferences: null,
                created_at: null,
                updated_at: null,
                profile_updated_at: null,
                last_login_at: null
            };
            
            console.log('No profile found, returning empty profile structure');
            
            return new Response(JSON.stringify({
                data: {
                    profile: emptyProfile,
                    profile_exists: false
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const profile = profiles[0];
        console.log('Profile found for user:', userId, 'Completion:', profile.profile_completion_percentage + '%');

        // Safe profile photo URL processing with comprehensive null checks
        try {
            if (profile.profile_photo_url &&
                typeof profile.profile_photo_url === 'string' &&
                profile.profile_photo_url.trim() !== '' &&
                !profile.profile_photo_url.startsWith('http')) {
                profile.profile_photo_url = `${supabaseUrl}/storage/v1/object/public/profile-photos/${profile.profile_photo_url}`;
                console.log('Profile photo URL converted to full URL');
            }
        } catch (error) {
            console.error('Error processing profile photo URL:', error);
            // Set to null if there's any error processing the URL
            profile.profile_photo_url = null;
        }

        const result = {
            data: {
                profile: profile,
                profile_exists: true,
                user_id: userId,
                auth_email: userData.email
            }
        };

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Customer profile get error:', error);

        const errorResponse = {
            error: {
                code: 'CUSTOMER_PROFILE_GET_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
