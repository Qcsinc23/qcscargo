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
        const method = req.method;
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Get user from auth header
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Authentication required');
        }

        const token = authHeader.replace('Bearer ', '');
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

        if (method === 'GET') {
            // Get user profile
            const profileResponse = await fetch(
                `${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${userId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            if (!profileResponse.ok) {
                throw new Error('Failed to fetch profile');
            }

            const profiles = await profileResponse.json();
            const profile = profiles[0] || null;

            // Get user role and status from users table
            const userInfoResponse = await fetch(
                `${supabaseUrl}/rest/v1/users?id=eq.${userId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            const userInfo = userInfoResponse.ok ? await userInfoResponse.json() : [];
            const userDetails = userInfo[0] || { role: 'customer', status: 'active' };

            const result = {
                user: {
                    id: userId,
                    email: userData.email,
                    role: userDetails.role,
                    status: userDetails.status,
                    email_verified: userDetails.email_verified
                },
                profile
            };

            return new Response(JSON.stringify({ data: result }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (method === 'POST' || method === 'PATCH') {
            // Create or update user profile
            const requestData = await req.json();
            
            const {
                company_name,
                contact_person,
                phone,
                address_line1,
                address_line2,
                city,
                state,
                zip_code,
                country = 'United States',
                preferred_contact_method = 'email',
                business_type,
                tax_id,
                emergency_contact,
                emergency_phone,
                preferences = {}
            } = requestData;

            if (!contact_person) {
                throw new Error('Contact person name is required');
            }

            const profileData = {
                user_id: userId,
                company_name,
                contact_person,
                phone,
                address_line1,
                address_line2,
                city,
                state,
                zip_code,
                country,
                preferred_contact_method,
                business_type,
                tax_id,
                emergency_contact,
                emergency_phone,
                preferences,
                updated_at: new Date().toISOString()
            };

            // Check if profile exists
            const existingProfileResponse = await fetch(
                `${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${userId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            const existingProfiles = existingProfileResponse.ok ? await existingProfileResponse.json() : [];
            const profileExists = existingProfiles.length > 0;

            let profileResponse;
            if (profileExists) {
                // Update existing profile
                profileResponse = await fetch(
                    `${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${userId}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(profileData)
                    }
                );
            } else {
                // Create new profile
                profileData.created_at = new Date().toISOString();
                profileResponse = await fetch(
                    `${supabaseUrl}/rest/v1/user_profiles`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(profileData)
                    }
                );
            }

            if (!profileResponse.ok) {
                const errorText = await profileResponse.text();
                throw new Error(`Profile operation failed: ${errorText}`);
            }

            const savedProfile = await profileResponse.json();

            // Update user record if needed
            if (requestData.email_notifications !== undefined || requestData.status !== undefined) {
                const userUpdates = {};
                if (requestData.status && ['active', 'inactive'].includes(requestData.status)) {
                    userUpdates.status = requestData.status;
                }
                userUpdates.updated_at = new Date().toISOString();

                if (Object.keys(userUpdates).length > 1) { // More than just updated_at
                    await fetch(
                        `${supabaseUrl}/rest/v1/users?id=eq.${userId}`,
                        {
                            method: 'PATCH',
                            headers: {
                                'Authorization': `Bearer ${serviceRoleKey}`,
                                'apikey': serviceRoleKey,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(userUpdates)
                        }
                    );
                }
            }

            const result = {
                success: true,
                profile: savedProfile[0],
                message: profileExists ? 'Profile updated successfully' : 'Profile created successfully'
            };

            return new Response(JSON.stringify({ data: result }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

    } catch (error) {
        console.error('Profile management error:', error);

        const errorResponse = {
            error: {
                code: 'PROFILE_OPERATION_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});