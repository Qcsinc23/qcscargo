import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleOptions, createErrorResponse, createSuccessResponse } from '../_shared/auth-utils.ts';

type Facility = {
  code: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleOptions();
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      return createErrorResponse('CONFIG_MISSING', 'Supabase configuration is missing.');
    }

    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
    if (!authHeader) {
      return createErrorResponse('UNAUTHORIZED', 'Authorization header is required.', 401);
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    const { data: authData, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !authData?.user) {
      return createErrorResponse('UNAUTHORIZED', 'Invalid or expired token.', 401);
    }

    const user = authData.user;

    const fetchMailbox = (client: ReturnType<typeof createClient>) =>
      client
        .from('virtual_mailboxes')
        .select(
          'mailbox_number, facility:facility_id(code, address_line1, address_line2, city, state, postal_code, country)'
        )
        .eq('user_id', user.id)
        .maybeSingle();

    let mailboxResult = await fetchMailbox(supabaseUser);

    if (mailboxResult.error && mailboxResult.error.code !== 'PGRST116') {
      console.warn('Primary mailbox lookup failed, attempting fallback:', mailboxResult.error.message);

      if (!supabaseServiceKey) {
        return createErrorResponse('MAILBOX_FETCH_FAILED', 'Unable to retrieve mailbox details.');
      }

      const supabaseService = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });

      mailboxResult = await fetchMailbox(supabaseService);

      if (mailboxResult.error && mailboxResult.error.code !== 'PGRST116') {
        console.error('Service role mailbox lookup failed:', mailboxResult.error);
        return createErrorResponse('MAILBOX_FETCH_FAILED', 'Unable to retrieve mailbox details.');
      }

      if (!mailboxResult.data) {
        return createErrorResponse('MAILBOX_NOT_FOUND', 'No virtual mailbox assigned to this user.', 404);
      }
    }

    if (!mailboxResult.data) {
      return createErrorResponse('MAILBOX_NOT_FOUND', 'No virtual mailbox assigned to this user.', 404);
    }

    const facility = mailboxResult.data.facility as Facility | null;

    if (!facility) {
      return createErrorResponse('FACILITY_NOT_FOUND', 'Mailbox facility details are missing.', 404);
    }

    const profileClient = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        })
      : supabaseUser;

    const { data: profile, error: profileError } = await profileClient
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.warn('Profiles lookup failed, continuing with fallback:', profileError.message);
    }

    let name = profile?.full_name?.trim();

    if (!name) {
      const { data: userProfile, error: userProfileError } = await profileClient
        .from('user_profiles')
        .select('first_name, last_name, contact_person')
        .eq('user_id', user.id)
        .maybeSingle();

      if (userProfileError) {
        console.warn('User profile lookup failed, continuing with fallback:', userProfileError.message);
      }

      if (userProfile?.contact_person) {
        name = String(userProfile.contact_person).trim();
      } else {
        const first = userProfile?.first_name?.trim();
        const last = userProfile?.last_name?.trim();
        const combined = [first, last].filter(Boolean).join(' ');
        if (combined) {
          name = combined;
        }
      }
    }

    if (!name) {
      const metadataName =
        typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : '';
      name = metadataName || user.email || 'Customer';
    }

    const address = {
      name,
      line1: facility.address_line1,
      line2: facility.address_line2,
      line3: `Mailbox ${mailboxResult.data.mailbox_number}`,
      city: facility.city,
      state: facility.state,
      postal_code: facility.postal_code,
      country: facility.country,
      facility_code: facility.code
    };

    return createSuccessResponse({ address, mailbox_number: mailboxResult.data.mailbox_number });
  } catch (error) {
    console.error('get-virtual-address error:', error);
    const message = error instanceof Error ? error.message : 'Unexpected error retrieving virtual address.';
    return createErrorResponse('UNEXPECTED_ERROR', message);
  }
});
