import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * BankID Verification Edge Function
 *
 * Placeholder endpoints for future integration with Svensk e-identitet
 * (or similar BankID provider). Two actions:
 *
 *   POST { action: "init" }
 *     → Initiates a BankID authentication/signing session.
 *       Returns an orderRef + autoStartToken for the client to launch BankID app.
 *
 *   POST { action: "collect", orderRef: "..." }
 *     → Polls the BankID session status.
 *       When complete, returns the verified personal number and name,
 *       and updates the user's profile (bankid_verified = true).
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Authenticate the caller
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify the JWT to get user ID
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = user.id;

  try {
    const { action, orderRef } = await req.json();

    if (action === "init") {
      // TODO: Replace with actual Svensk e-identitet API call
      const mockOrderRef = crypto.randomUUID();

      return new Response(
        JSON.stringify({
          status: "pending",
          orderRef: mockOrderRef,
          autoStartToken: `mock-${mockOrderRef.slice(0, 8)}`,
          message:
            "BankID-integration är inte aktiverad ännu. Detta är en placeholder.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "collect") {
      if (!orderRef) {
        return new Response(
          JSON.stringify({ error: "orderRef krävs för collect" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // BankID integration not yet implemented — reject all collect attempts
      return new Response(
        JSON.stringify({
          error: "BankID-verifiering är inte tillgänglig ännu. Funktionen är under utveckling.",
        }),
        {
          status: 501,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: "Ogiltig action. Använd 'init' eller 'collect'.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("BankID verify error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
