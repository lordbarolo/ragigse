import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require authenticated admin
  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action } = body;

    // --- CONTRACT VERSIONS ---
    if (action === "versions") {
      const { data, error } = await supabase
        .from("contract_versions")
        .select("id, catalog_name, version_label, effective_from, imported_at, is_active, notes")
        .order("effective_from", { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify({ versions: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- AUDIT OPT-INS ---
    if (action === "audit-optins") {
      const { data, error } = await supabase
        .from("audit_optins")
        .select("id, report_id, email, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify({ optins: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- DATA COUNTS (leads + reports) ---
    if (action === "data-counts") {
      const [leadsRes, reportsRes] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("reports").select("id", { count: "exact", head: true }),
      ]);

      return new Response(JSON.stringify({
        leads: leadsRes.count ?? 0,
        reports: reportsRes.count ?? 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- REFERRAL STATS ---
    if (action === "referrals") {
      const { data, error } = await supabase
        .from("referrals")
        .select("id, referrer_email, referee_email, clicked, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify({ referrals: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- BUG REPORTS ---
    if (action === "bug-reports") {
      const { data, error } = await supabase
        .from("bug_reports")
        .select("id, created_at, page_url, category, description, email, status")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return new Response(JSON.stringify({ reports: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- UPDATE BUG REPORT STATUS ---
    if (action === "update-bug-status") {
      const { id, status } = body;
      if (!id || !status) throw new Error("Missing id or status");

      const { error } = await supabase
        .from("bug_reports")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- CHAT ANSWER REPORTS ---
    if (action === "chat-answer-reports") {
      const { data, error } = await supabase
        .from("chat_answer_reports")
        .select("id, message_content, context_json, user_email, page_url, status, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return new Response(JSON.stringify({ reports: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- UPDATE CHAT ANSWER REPORT STATUS ---
    if (action === "update-chat-report-status") {
      const { id, status } = body;
      if (!id || !status) throw new Error("Missing id or status");

      const { error } = await supabase
        .from("chat_answer_reports")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-data error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
