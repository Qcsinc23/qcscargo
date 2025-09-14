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
        const requestData = await req.json();
        const { profileData } = requestData;

        if (!profileData) {
            throw new Error('Profile data is required');
        }

        console.log('Profile update request received');

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
        console.log('Updating profile for user:', userId);

        // Validate and sanitize profile data with safe string handling
        const validatedProfile = {
            first_name: (profileData.first_name && typeof profileData.first_name === 'string') ? profileData.first_name.trim() : '',
            last_name: (profileData.last_name && typeof profileData.last_name === 'string') ? profileData.last_name.trim() : '',
            email: (profileData.email && typeof profileData.email === 'string') ? profileData.email.trim() : (userData.email || ''),
            company_name: (profileData.company_name && typeof profileData.company_name === 'string') ? profileData.company_name.trim() : '',
            contact_person: (profileData.contact_person && typeof profileData.contact_person === 'string') ? profileData.contact_person.trim() : '',
            phone: (profileData.phone && typeof profileData.phone === 'string') ? profileData.phone.trim() : '',
            phone_country_code: (profileData.phone_country_code && typeof profileData.phone_country_code === 'string') ? profileData.phone_country_code.trim() : '+1',
            address_line1: profileData.address_line1?.trim() || '',
            address_line2: profileData.address_line2?.trim() || '',
            city: profileData.city?.trim() || '',
            state: profileData.state?.trim() || '',
            zip_code: profileData.zip_code?.trim() || '',
            postal_code: profileData.postal_code?.trim() || '',
            country: profileData.country?.trim() || 'United States',
            region: profileData.region?.trim() || '',
            district: profileData.district?.trim() || '',
            business_type: profileData.business_type?.trim() || '',
            tax_id: profileData.tax_id?.trim() || '',
            preferred_contact_method: profileData.preferred_contact_method || 'email',
            emergency_contact: profileData.emergency_contact?.trim() || '',
            emergency_phone: profileData.emergency_phone?.trim() || '',
            preferences: profileData.preferences || null,
            updated_at: new Date().toISOString(),
            profile_updated_at: new Date().toISOString()
        };

        // Regional validation logic
        if (validatedProfile.country === 'Guyana') {
            // Validate Guyana-specific fields
            if (validatedProfile.phone_country_code !== '+592') {
                validatedProfile.phone_country_code = '+592';
            }
        } else if (validatedProfile.country === 'United States') {
            // Validate US-specific fields
            if (validatedProfile.phone_country_code !== '+1') {
                validatedProfile.phone_country_code = '+1';
            }
            
            // ZIP code validation for US
            if (validatedProfile.zip_code && !/^\d{5}(-\d{4})?$/.test(validatedProfile.zip_code)) {
                throw new Error('Invalid US ZIP code format. Use 12345 or 12345-6789 format.');
            }
        } else if (['Jamaica', 'Trinidad and Tobago', 'Barbados', 'Dominican Republic', 'Puerto Rico'].includes(validatedProfile.country)) {
            // Caribbean countries with +1 variants
            const caribbeanCodes = {
                'Jamaica': '+1-876',
                'Trinidad and Tobago': '+1-868',
                'Barbados': '+1-246',
                'Dominican Republic': '+1-809',
                'Puerto Rico': '+1-787'
            };
            
            // Safe Caribbean phone country code processing with comprehensive null checks
            try {
                const currentCode = validatedProfile.phone_country_code;
                const isValidString = currentCode && typeof currentCode === 'string' && currentCode.trim() !== '';
                const startsWithPlusOne = isValidString && currentCode.startsWith('+1');
                
                if (!isValidString || !startsWithPlusOne) {
                    validatedProfile.phone_country_code = caribbeanCodes[validatedProfile.country] || '+1';
                    console.log('Updated Caribbean phone country code for', validatedProfile.country);
                }
            } catch (error) {
                console.error('Error processing Caribbean phone country code:', error);
                // Fallback to safe default
                validatedProfile.phone_country_code = '+1';
            }
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(validatedProfile.email)) {
            throw new Error('Invalid email address format');
        }

        // Phone validation (basic)
        if (validatedProfile.phone && !/^[\d\s\-\(\)\+]+$/.test(validatedProfile.phone)) {
            throw new Error('Invalid phone number format');
        }

        // Check if profile exists
        const checkResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${userId}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        const existingProfiles = await checkResponse.json();
        const profileExists = existingProfiles.length > 0;

        let profileResponse;
        
        if (profileExists) {
            // Update existing profile
            console.log('Updating existing profile');
            profileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${userId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(validatedProfile)
            });
        } else {
            // Create new profile
            console.log('Creating new profile');
            const newProfile = {
                user_id: userId,
                ...validatedProfile,
                created_at: new Date().toISOString()
            };
            
            profileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(newProfile)
            });
        }

        if (!profileResponse.ok) {
            const errorText = await profileResponse.text();
            console.error('Failed to save profile:', errorText);
            throw new Error('Failed to save customer profile');
        }

        const updatedProfile = await profileResponse.json();
        const profile = updatedProfile[0];
        
        console.log('Profile updated successfully. Completion:', profile.profile_completion_percentage + '%');

        const result = {
            data: {
                profile: profile,
                success: true,
                message: 'Profile updated successfully',
                completion_percentage: profile.profile_completion_percentage
            }
        };

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Customer profile update error:', error);

        const errorResponse = {
            error: {
                code: 'CUSTOMER_PROFILE_UPDATE_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
