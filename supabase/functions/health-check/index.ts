import { corsHeaders } from "../_shared/cors-utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase configuration missing");
    }

    const healthChecks = {
      database: false,
      auth: false,
      edge_functions: true, // We're running, so this is true
      timestamp: new Date().toISOString()
    };

    // Test database connection
    try {
      const dbResponse = await fetch(`${supabaseUrl}/rest/v1/vehicles?select=count&limit=1`, {
        headers: {
          "Authorization": `Bearer ${serviceRoleKey}`,
          "apikey": serviceRoleKey
        }
      });
      healthChecks.database = dbResponse.ok;
    } catch (error) {
      console.error("Database health check failed:", error);
    }

    // Test auth service
    try {
      const authResponse = await fetch(`${supabaseUrl}/auth/v1/health`, {
        headers: {
          "Authorization": `Bearer ${serviceRoleKey}`,
          "apikey": serviceRoleKey
        }
      });
      healthChecks.auth = authResponse.ok;
    } catch (error) {
      console.error("Auth health check failed:", error);
    }

    const overallStatus = healthChecks.database && healthChecks.auth && healthChecks.edge_functions ? "healthy" : "unhealthy";

    return new Response(JSON.stringify({
      status: overallStatus,
      checks: healthChecks,
      version: "1.0.0",
      uptime: process.uptime ? process.uptime() : "unknown"
    }), {
      status: overallStatus === "healthy" ? 200 : 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Health check failed:", error);
    
    return new Response(JSON.stringify({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
