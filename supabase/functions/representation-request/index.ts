import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getAuthUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- GET BY TOKEN (public, for signing page) ---
    if (action === "get-by-token") {
      const { token } = params;
      if (!token) {
        return new Response(JSON.stringify({ error: "Missing token" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await admin
        .from("ref_representation_requests")
        .select("*")
        .eq("secret_token", token)
        .single();

      if (error || !data) {
        return new Response(JSON.stringify({ error: "Request not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ request: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- SIGN (consultant signs the representation) ---
    if (action === "sign") {
      const { token } = params;
      if (!token) {
        return new Response(JSON.stringify({ error: "Missing token" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch the request
      const { data: request, error: fetchErr } = await admin
        .from("ref_representation_requests")
        .select("*")
        .eq("secret_token", token)
        .eq("status", "pending")
        .single();

      if (fetchErr || !request) {
        return new Response(JSON.stringify({ error: "Request not found or already processed" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // TODO: Real BankID integration here - for now, simulate success
      const bankidRef = `SIM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

      // Build payload snapshot
      const payload = {
        signed_text: `Jag bekräftar att jag gjort ett aktivt val att representeras av ${request.agency_name} för uppdrag ${request.assignment_id} i ${request.region}.`,
        bankid_ref: bankidRef,
        signed_at: new Date().toISOString(),
        consultant_email: request.consultant_email,
        agency_name: request.agency_name,
        assignment_id: request.assignment_id,
        region: request.region,
      };

      // Create a verification record
      const { data: verification, error: verErr } = await admin
        .from("ref_verifications")
        .insert({
          profile_id: request.consultant_user_id || "00000000-0000-0000-0000-000000000000",
          type: "representation",
          result: "verified",
          notes: `Representation signed for ${request.agency_name}, assignment ${request.assignment_id}`,
        })
        .select("id")
        .single();

      const verificationId = verification?.id || null;

      // Update the request
      const { error: updateErr } = await admin
        .from("ref_representation_requests")
        .update({
          status: "signed",
          signed_at: new Date().toISOString(),
          bankid_ref: bankidRef,
          payload,
          verification_id: verificationId,
        })
        .eq("id", request.id);

      if (updateErr) throw updateErr;

      return new Response(JSON.stringify({
        success: true,
        verification_id: verificationId,
        bankid_ref: bankidRef,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- LIST (agency lists their requests) ---
    if (action === "list") {
      const userId = await getAuthUserId(req);
      if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use the safe view to avoid returning secret_token to the agency frontend
      const { data, error } = await admin
        .from("ref_representation_requests_safe")
        .select("*")
        .eq("agency_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const counts = {
        total: (data || []).length,
        pending: (data || []).filter((r: any) => r.status === "pending").length,
        signed: (data || []).filter((r: any) => r.status === "signed").length,
        declined: (data || []).filter((r: any) => r.status === "declined").length,
      };

      return new Response(JSON.stringify({ requests: data || [], counts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- CREATE (agency creates a new request) ---
    if (action === "create") {
      const userId = await getAuthUserId(req);
      if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { consultant_email, assignment_id, region, agency_name } = params;
      if (!consultant_email || !assignment_id || !region) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await admin
        .from("ref_representation_requests")
        .insert({
          agency_id: userId,
          consultant_email,
          assignment_id,
          region,
          agency_name: agency_name || "",
        })
        .select("id, secret_token")
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ created: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Representation request error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
