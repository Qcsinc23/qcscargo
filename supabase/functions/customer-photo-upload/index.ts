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
        const { imageData, fileName } = await req.json();

        if (!imageData || !fileName) {
            throw new Error('Image data and filename are required');
        }

        console.log('Profile photo upload request received:', fileName);

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
        console.log('Uploading profile photo for user:', userId);

        // Validate image data URL format
        if (!imageData.startsWith('data:image/')) {
            throw new Error('Invalid image data format');
        }

        // Extract base64 data from data URL
        const base64Data = imageData.split(',')[1];
        const mimeType = imageData.split(';')[0].split(':')[1];
        
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!allowedTypes.includes(mimeType)) {
            throw new Error('Invalid image format. Only JPEG, PNG, and WebP are allowed.');
        }

        // Convert base64 to binary
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        // Check file size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (binaryData.length > maxSize) {
            throw new Error('Image size exceeds 5MB limit');
        }

        // Generate unique filename with user ID prefix
        const fileExtension = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
        const uniqueFileName = `${userId}_${Date.now()}.${fileExtension}`;
        
        console.log('Uploading file:', uniqueFileName, 'Size:', Math.round(binaryData.length / 1024) + 'KB');

        // Get current profile to check for existing photo
        const profileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${userId}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        let existingPhotoUrl = null;
        if (profileResponse.ok) {
            const profiles = await profileResponse.json();
            if (profiles.length > 0 && profiles[0].profile_photo_url) {
                existingPhotoUrl = profiles[0].profile_photo_url;
                console.log('Found existing photo URL:', existingPhotoUrl);
            }
        }

        // Upload to Supabase Storage
        const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/profile-photos/${uniqueFileName}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': mimeType,
                'x-upsert': 'true'
            },
            body: binaryData
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('Storage upload failed:', errorText);
            throw new Error(`Upload failed: ${errorText}`);
        }

        console.log('File uploaded successfully to storage');

        // Get public URL
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/profile-photos/${uniqueFileName}`;

        // Update user profile with new photo URL
        const updateProfileData = {
            profile_photo_url: publicUrl,
            profile_updated_at: new Date().toISOString()
        };

        // Check if profile exists first
        const checkProfileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${userId}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        const existingProfiles = await checkProfileResponse.json();
        const profileExists = existingProfiles.length > 0;

        let profileUpdateResponse;
        
        if (profileExists) {
            // Update existing profile
            profileUpdateResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${userId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(updateProfileData)
            });
        } else {
            // Create new profile with photo
            const newProfileData = {
                user_id: userId,
                email: userData.email || '',
                profile_photo_url: publicUrl,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                profile_updated_at: new Date().toISOString()
            };
            
            profileUpdateResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(newProfileData)
            });
        }

        if (!profileUpdateResponse.ok) {
            const errorText = await profileUpdateResponse.text();
            console.error('Profile update failed:', errorText);
            
            // If profile update fails, try to delete the uploaded file
            try {
                await fetch(`${supabaseUrl}/storage/v1/object/profile-photos/${uniqueFileName}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`
                    }
                });
                console.log('Cleaned up uploaded file due to profile update failure');
            } catch (cleanupError) {
                console.error('Failed to cleanup uploaded file:', cleanupError.message);
            }
            
            throw new Error('Failed to update profile with photo URL');
        }

        const updatedProfile = await profileUpdateResponse.json();
        console.log('Profile updated with new photo URL');

        // Delete old photo if it exists and is different
        if (existingPhotoUrl && existingPhotoUrl !== publicUrl) {
            try {
                // Extract filename from old URL
                const oldFileName = existingPhotoUrl.split('/').pop();
                if (oldFileName && oldFileName !== uniqueFileName) {
                    const deleteResponse = await fetch(`${supabaseUrl}/storage/v1/object/profile-photos/${oldFileName}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`
                        }
                    });
                    
                    if (deleteResponse.ok) {
                        console.log('Successfully deleted old profile photo:', oldFileName);
                    } else {
                        console.log('Could not delete old profile photo (may not exist):', oldFileName);
                    }
                }
            } catch (deleteError) {
                console.error('Error deleting old photo:', deleteError.message);
                // Continue execution - this is not critical
            }
        }

        const result = {
            data: {
                publicUrl: publicUrl,
                fileName: uniqueFileName,
                fileSize: binaryData.length,
                mimeType: mimeType,
                profile: updatedProfile[0],
                success: true,
                message: 'Profile photo uploaded successfully'
            }
        };

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Profile photo upload error:', error);

        const errorResponse = {
            error: {
                code: 'PHOTO_UPLOAD_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
