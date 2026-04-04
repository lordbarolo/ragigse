import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    // 1. Anonymize leads
    await supabase
      .from("leads")
      .update({ email: null, yrke: null, kommun: null, current_salary: null })
      .eq("email", user.email || "");

    // 2. Anonymize reports
    await supabase
      .from("reports")
      .update({ result_json: null })
      .eq("user_id", userId);

    // 3. Delete consultant data
    // First get consultant_profile ids for cascade
    const { data: cpRows } = await supabase
      .from("consultant_profiles")
      .select("id")
      .eq("user_id", userId);

    if (cpRows && cpRows.length > 0) {
      const cpIds = cpRows.map((r: any) => r.id);
      await supabase.from("consultant_documents").delete().in("consultant_id", cpIds);
      await supabase.from("consultant_references").delete().in("consultant_id", cpIds);
      await supabase.from("consultant_profiles").delete().eq("user_id", userId);
    }

    // 4. Delete ref system data
    await supabase.from("ref_references").delete().eq("individual_id", userId);
    await supabase.from("ref_verifications").delete().eq("profile_id", userId);
    await supabase.from("ref_profiles").delete().eq("id", userId);

    // 5. Delete profiles
    await supabase.from("profiles").delete().eq("user_id", userId);

    // 6. Delete user from auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError.message);
      return new Response(JSON.stringify({ error: "Kunde inte radera kontot" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Account deleted: ${userId}`);

    return new Response(JSON.stringify({ deleted: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Delete account error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
