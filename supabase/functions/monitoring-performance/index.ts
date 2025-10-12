import { corsHeaders } from "../_shared/cors-utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { name, value, unit, timestamp, metadata } = await req.json();

    if (!name || value === undefined) {
      throw new Error("Metric name and value are required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase configuration missing");
    }

    // Insert performance metric into system_health table
    const metricData = {
      component: "performance",
      status: "healthy",
      message: `Performance metric: ${name}`,
      details: {
        metric_name: name,
        value,
        unit,
        metadata
      },
      metrics: {
        [name]: value,
        unit,
        timestamp
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
      body: JSON.stringify(metricData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to log performance metric: ${errorText}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Performance logging failed:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
