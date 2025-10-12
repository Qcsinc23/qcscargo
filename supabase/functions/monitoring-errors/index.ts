import { corsHeaders } from "../_shared/cors-utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { message, stack, context } = await req.json();

    if (!message) {
      throw new Error("Error message is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase configuration missing");
    }

    // Insert error into error_logs table
    const errorData = {
      error_type: "client_error",
      error_message: message,
      error_details: {
        stack,
        context,
        user_agent: context?.userAgent,
        url: context?.url,
        session_id: context?.sessionId,
        component: context?.component,
        action: context?.action,
        metadata: context?.metadata
      },
      stack_trace: stack,
      url: context?.url,
      user_agent: context?.userAgent,
      session_id: context?.sessionId,
      severity: "error",
      created_at: new Date().toISOString()
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/error_logs`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(errorData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to log error: ${errorText}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error logging failed:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
