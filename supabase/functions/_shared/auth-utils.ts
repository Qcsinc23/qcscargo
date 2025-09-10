/**
 * Shared authentication utilities for Supabase Edge Functions
 * Handles both 'role' and 'user_type' columns for backward compatibility
 */

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
  user_type?: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

/**
 * Verify admin access with fallback for both role columns
 */
export async function verifyAdminAccess(
  authHeader: string,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<AuthResult> {
  try {
    if (!authHeader) {
      return { success: false, error: 'Authorization header missing' };
    }

    // Extract token from Bearer header
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return { success: false, error: 'Invalid authorization format' };
    }

    // Verify the user is authenticated
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': authHeader,
        'apikey': serviceRoleKey
      }
    });

    if (!userResponse.ok) {
      return { success: false, error: 'Invalid authentication token' };
    }

    const user = await userResponse.json();
    
    if (!user || !user.id) {
      return { success: false, error: 'Invalid user data' };
    }
    
    // Check if user has admin role - handle both 'role' and 'user_type' columns
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_profiles?select=role,user_type&id=eq.${user.id}`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!profileResponse.ok) {
      return { success: false, error: 'Failed to verify user profile' };
    }

    const profiles = await profileResponse.json();
    if (!profiles || !profiles.length) {
      return { success: false, error: 'User profile not found' };
    }

    const profile = profiles[0];
    const isAdmin = profile.role === 'admin' || profile.user_type === 'admin';
    
    if (!isAdmin) {
      return { 
        success: false, 
        error: 'Insufficient permissions - admin access required',
        user: {
          id: user.id,
          email: user.email,
          role: profile.role,
          user_type: profile.user_type
        }
      };
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: profile.role,
        user_type: profile.user_type
      }
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, error: `Authentication error: ${error.message}` };
  }
}

/**
 * Standard CORS headers for all functions
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false'
};

/**
 * Handle OPTIONS requests
 */
export function handleOptions(): Response {
  return new Response(null, { status: 200, headers: corsHeaders });
}

/**
 * Create error response
 */
export function createErrorResponse(code: string, message: string, status: number = 500): Response {
  console.error(`Error ${status}: ${code} - ${message}`);
  return new Response(JSON.stringify({
    error: { code, message }
  }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * Create success response
 */
export function createSuccessResponse(data: any): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * Log admin action for audit trail
 */
export function logAdminAction(action: string, adminUser: AuthUser, details?: any): void {
  console.log(`ADMIN ACTION: ${action}`, {
    admin_id: adminUser.id,
    admin_email: adminUser.email,
    admin_role: adminUser.role || adminUser.user_type,
    action,
    details,
    timestamp: new Date().toISOString()
  });
}