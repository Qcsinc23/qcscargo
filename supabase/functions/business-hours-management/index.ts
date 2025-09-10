// @ts-nocheck

// Supabase Edge Function (Deno) for managing business_hours
// Uses REST endpoint with Service Role key. This file runs in Deno at the edge.
// The @ts-nocheck directive silences VSCode's Node TypeScript errors for Deno globals.

const corsHeaders: HeadersInit = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false',
  'Content-Type': 'application/json'
};

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(corsHeaders);
  if (init.headers) {
    for (const [k, v] of new Headers(init.headers).entries()) headers.set(k, v);
  }
  return new Response(JSON.stringify(data), { ...init, headers });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ success: false, error: 'Supabase configuration missing' }, { status: 500 });
  }

  try {
    const baseHeaders: HeadersInit = {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      'Content-Type': 'application/json'
    };

    if (req.method === 'GET') {
      // List all business hours for admin UI
      const url = `${supabaseUrl}/rest/v1/business_hours?select=*&order=day_of_week.asc`;
      const res = await fetch(url, { headers: baseHeaders });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Fetch business_hours failed: ${res.status} ${t}`);
      }
      const data = await res.json();
      return json({ success: true, data }, { status: 200 });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      // Upsert business hours entry/entries
      const payload = await req.json().catch(() => ({}));

      // Ensure array payload for upsert
      const body = Array.isArray(payload) ? payload : [payload];

      const upsertHeaders = {
        ...baseHeaders,
        // Upsert based on unique constraints (day_of_week when specific_date is null, or specific_date)
        Prefer: 'return=representation,resolution=merge-duplicates'
      };

      const res = await fetch(`${supabaseUrl}/rest/v1/business_hours`, {
        method: 'POST',
        headers: upsertHeaders,
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Upsert business_hours failed: ${res.status} ${t}`);
      }

      const data = await res.json();
      return json({ success: true, data }, { status: 200 });
    }

    return json(
      { success: false, error: `Method ${req.method} Not Allowed` },
      { status: 405, headers: { Allow: 'GET, POST, PUT' } }
    );
  } catch (error: any) {
    console.error('business-hours-management error:', error);
    return json(
      { success: false, error: error?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
});
