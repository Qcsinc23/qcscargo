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
        console.log('Profile photo delete request received');

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
        console.log('Deleting profile photo for user:', userId);

        // Get current profile to find photo URL
        const profileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${userId}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!profileResponse.ok) {
            throw new Error('Failed to fetch user profile');
        }

        const profiles = await profileResponse.json();
        
        if (profiles.length === 0) {
            throw new Error('User profile not found');
        }

        const profile = profiles[0];
        const currentPhotoUrl = profile.profile_photo_url;

        if (!currentPhotoUrl) {
            // No photo to delete
            return new Response(JSON.stringify({
                data: {
                    success: true,
                    message: 'No profile photo to delete',
                    profile: profile
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        console.log('Current photo URL:', currentPhotoUrl);

        // Extract filename from URL
        const fileName = currentPhotoUrl.split('/').pop();
        if (!fileName) {
            throw new Error('Invalid photo URL format');
        }

        console.log('Deleting file from storage:', fileName);

        // Delete from Supabase Storage
        const deleteResponse = await fetch(`${supabaseUrl}/storage/v1/object/profile-photos/${fileName}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`
            }
        });

        let storageDeleteSuccess = false;
        if (deleteResponse.ok) {
            console.log('Successfully deleted file from storage');
            storageDeleteSuccess = true;
        } else {
            const errorText = await deleteResponse.text();
            console.log('Storage delete response:', errorText);
            // Continue even if storage delete fails - file might not exist
            console.log('Storage delete failed, but continuing to update profile');
        }

        // Update profile to remove photo URL
        const updateProfileData = {
            profile_photo_url: null,
            profile_updated_at: new Date().toISOString()
        };

        const profileUpdateResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${userId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(updateProfileData)
        });

        if (!profileUpdateResponse.ok) {
            const errorText = await profileUpdateResponse.text();
            console.error('Profile update failed:', errorText);
            throw new Error('Failed to update profile after photo deletion');
        }

        const updatedProfile = await profileUpdateResponse.json();
        console.log('Profile updated - photo URL removed');

        const result = {
            data: {
                success: true,
                message: 'Profile photo deleted successfully',
                storage_deleted: storageDeleteSuccess,
                profile: updatedProfile[0],
                deleted_file: fileName
            }
        };

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Profile photo delete error:', error);

        const errorResponse = {
            error: {
                code: 'PHOTO_DELETE_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
