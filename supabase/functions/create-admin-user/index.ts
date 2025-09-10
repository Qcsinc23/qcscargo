import { verifyAdminAccess, corsHeaders, handleOptions, createErrorResponse, createSuccessResponse, logAdminAction } from '../_shared/auth-utils.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return handleOptions();
    }

    try {
        // Get environment variables first
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            return createErrorResponse('CONFIG_ERROR', 'Missing Supabase configuration', 500);
        }

        // SECURITY: Verify admin authentication for user creation
        const authHeader = req.headers.get('authorization');
        const authResult = await verifyAdminAccess(authHeader, supabaseUrl, serviceRoleKey);

        if (!authResult.success) {
            return createErrorResponse('UNAUTHORIZED', authResult.error || 'Admin access required to create users', 401);
        }

        console.log(`Admin user creation request from: ${authResult.user!.email}`);

      // Get parameters from request body
      const requestBody = await req.json();
      const { email, password, role = 'authenticated' } = requestBody;

      if (!email || !password) {
        return new Response(JSON.stringify({
          error: { code: 'MISSING_PARAMS', message: 'Email and password are required' }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      // Log admin action
      logAdminAction('CREATE_ADMIN_USER_ATTEMPT', authResult.user!, {
        target_email: email,
        target_role: role
      });

      // Generate user ID
      const userId = crypto.randomUUID();
      const now = new Date().toISOString();

      // Create user record (directly insert into auth.users table)
      const insertUserQuery = `
        INSERT INTO auth.users (
          id, email, encrypted_password, email_confirmed_at,
          created_at, updated_at, role, aud,
          confirmation_token, email_confirm_token_sent_at
        ) VALUES (
          $1, $2, crypt($3, gen_salt('bf')), $4,
          $5, $6, $7, 'authenticated',
          '', $8
        ) RETURNING id, email, created_at
      `;

      // Use fetch to call Supabase REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey,
        },
        body: JSON.stringify({
          query: insertUserQuery,
          params: [userId, email, password, now, now, now, role, now]
        })
      });

      if (!response.ok) {
        // If direct insert fails, try using Admin API to create user
        const adminResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            'apikey': serviceRoleKey,
          },
          body: JSON.stringify({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: { role: role }
          })
        });

        if (!adminResponse.ok) {
          const errorText = await adminResponse.text();
          return new Response(JSON.stringify({
            error: {
              code: 'USER_CREATION_FAILED',
              message: `Failed to create user: ${errorText}`,
              details: { status: adminResponse.status }
            }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          });
        }

        const userData = await adminResponse.json();
        
        // Log successful user creation
        logAdminAction('CREATE_ADMIN_USER_SUCCESS', authResult.user!, {
          created_user_id: userData.id,
          created_user_email: userData.email,
          method: 'admin_api'
        });

        return createSuccessResponse({
          success: true,
          message: 'Admin user created successfully via Admin API',
          user: {
            id: userData.id,
            email: userData.email,
            created_at: userData.created_at,
            method: 'admin_api'
          }
        });
      }

      const userData = await response.json();
      
      // Log successful user creation
      logAdminAction('CREATE_ADMIN_USER_SUCCESS', authResult.user!, {
        created_user_id: userId,
        created_user_email: email,
        method: 'direct_sql'
      });

      return createSuccessResponse({
        success: true,
        message: 'Admin user created successfully via direct SQL',
        user: {
          id: userId,
          email: email,
          created_at: now,
          method: 'direct_sql'
        }
      });

    } catch (error) {
      console.error('Create admin user function error:', error);
      return createErrorResponse('FUNCTION_ERROR', error.message, 500);
    }
  });
