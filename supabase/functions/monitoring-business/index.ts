import { corsHeaders } from "../_shared/cors-utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { event, value, properties, timestamp, userId } = await req.json();

    if (!event) {
      throw new Error("Event name is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase configuration missing");
    }

    // Insert business metric into system_health table
    const businessData = {
      component: "business_metrics",
      status: "healthy",
      message: `Business event: ${event}`,
      details: {
        event,
        value,
        properties,
        userId
      },
      metrics: {
        event,
        value: value || 1,
        timestamp: timestamp || new Date().toISOString()
      },
      checked_at: timestamp || new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/system_health`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(businessData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to log business metric: ${errorText}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Business metric logging failed:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
