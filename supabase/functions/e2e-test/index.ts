import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TestStep {
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  details: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const functionsBase = `${supabaseUrl}/functions/v1`;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const steps: TestStep[] = [];

  const testEmail = `e2e-test-${Date.now()}@test.bragig.se`;
  let leadId: string | null = null;
  let reportId: string | null = null;
  let referralToken: string | null = null;

  // Helper to call edge functions
  async function callFn(name: string, body: Record<string, unknown>) {
    const res = await fetch(`${functionsBase}/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anonKey,
        "Authorization": `Bearer ${anonKey}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  try {
    // ──────────────────────────────────────────────
    // STEP 1: Create a test lead
    // ──────────────────────────────────────────────
    try {
      const { data: lead, error } = await supabase
        .from("leads")
        .insert({
          email: testEmail,
          employment_type: "anstalld",
          yrke: "Legitimerad sjuksköterska",
          kommun: "Stockholm",
          experience: 5,
          current_salary: 35000,
          salary_type: "monthly",
        })
        .select("id")
        .single();

      if (error) throw error;
      leadId = lead.id;
      steps.push({ name: "1. Create test lead", status: "PASS", details: `lead_id: ${leadId}` });
    } catch (e) {
      steps.push({ name: "1. Create test lead", status: "FAIL", details: String(e) });
    }

    // ──────────────────────────────────────────────
    // STEP 2: Create report via edge function
    // ──────────────────────────────────────────────
    try {
      const { status, data } = await callFn("create-report", {
        lead_id: leadId,
        email: testEmail,
        occupation: "Legitimerad sjuksköterska",
        employment_type: "anstalld",
        kommun: "Stockholm",
        experience: 5,
        current_salary: 35000,
        salary_type: "monthly",
      });

      if (status !== 200 || !data.report_id) throw new Error(JSON.stringify(data));
      reportId = data.report_id;

      // Verify report in DB
      const { data: report } = await supabase
        .from("reports")
        .select("status, result_json, email")
        .eq("id", reportId)
        .single();

      steps.push({
        name: "2. Create report (create-report)",
        status: report?.status === "preview" ? "PASS" : "FAIL",
        details: `report_id: ${reportId}`,
        after: { status: report?.status, has_result_json: !!report?.result_json, email: report?.email },
      });
    } catch (e) {
      steps.push({ name: "2. Create report (create-report)", status: "FAIL", details: String(e) });
    }

    // ──────────────────────────────────────────────
    // STEP 3: Verify get-report returns preview (masked)
    // ──────────────────────────────────────────────
    if (reportId) {
      try {
        const { data } = await callFn("get-report", { report_id: reportId });
        const hasRecommendation = !!(data.result_json as any)?.recommendation;
        steps.push({
          name: "3. Get report (preview mode)",
          status: data.access === "preview" && !hasRecommendation ? "PASS" : "FAIL",
          details: `access: ${data.access}, recommendation_hidden: ${!hasRecommendation}`,
        });
      } catch (e) {
        steps.push({ name: "3. Get report (preview mode)", status: "FAIL", details: String(e) });
      }
    }

    // ──────────────────────────────────────────────
    // STEP 4: Simulate payment (mock — direct DB update)
    // ──────────────────────────────────────────────
    if (reportId && leadId) {
      try {
        const before = await supabase.from("reports").select("status, paid_at").eq("id", reportId).single();

        // Simulate what verify-payment does
        await supabase.from("leads").update({ paid: true }).eq("id", leadId);
        await supabase
          .from("reports")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", reportId);

        const fakeSessionId = `cs_test_e2e_${Date.now()}`;
        await supabase.from("payments").insert({
          lead_id: leadId,
          report_id: reportId,
          stripe_session_id: fakeSessionId,
          amount_ore: 14900,
          currency: "sek",
          status: "paid",
          plan: "single",
        });

        const afterReport = await supabase.from("reports").select("status, paid_at").eq("id", reportId).single();
        const afterPayment = await supabase
          .from("payments")
          .select("status, amount_ore")
          .eq("stripe_session_id", fakeSessionId)
          .single();

        steps.push({
          name: "4. Simulate payment (mock Stripe)",
          status: afterReport.data?.status === "paid" && afterPayment.data?.status === "paid" ? "PASS" : "FAIL",
          details: "Direct DB update simulating verify-payment",
          before: { report_status: before.data?.status },
          after: {
            report_status: afterReport.data?.status,
            payment_status: afterPayment.data?.status,
            payment_amount_ore: afterPayment.data?.amount_ore,
          },
        });
      } catch (e) {
        steps.push({ name: "4. Simulate payment (mock Stripe)", status: "FAIL", details: String(e) });
      }
    }

    // ──────────────────────────────────────────────
    // STEP 5: Verify get-report returns full data after payment
    // ──────────────────────────────────────────────
    if (reportId) {
      try {
        const { data } = await callFn("get-report", { report_id: reportId });
        const hasRecommendation = !!(data.result_json as any)?.recommendation;
        steps.push({
          name: "5. Get report (paid mode)",
          status: data.access === "full" && hasRecommendation ? "PASS" : "FAIL",
          details: `access: ${data.access}, has_recommendation: ${hasRecommendation}`,
        });
      } catch (e) {
        steps.push({ name: "5. Get report (paid mode)", status: "FAIL", details: String(e) });
      }
    }

    // ──────────────────────────────────────────────
    // STEP 6: Reset report to preview for referral test
    // ──────────────────────────────────────────────
    if (reportId) {
      await supabase
        .from("reports")
        .update({ status: "preview", paid_at: null, unlocked_by_referral: false, referral_unlocked_at: null })
        .eq("id", reportId);
    }

    // ──────────────────────────────────────────────
    // STEP 7: Send referral
    // ──────────────────────────────────────────────
    if (leadId) {
      try {
        const refereeEmail = `e2e-referee-${Date.now()}@test.bragig.se`;
        const { status, data } = await callFn("send-referral", {
          lead_id: leadId,
          referrer_email: testEmail,
          referee_email: refereeEmail,
          region: "Stockholm",
          send_email: false, // Don't send real email in test
        });

        if (status !== 200 || !data.token) throw new Error(JSON.stringify(data));
        referralToken = data.token;

        // Verify referral in DB
        const { data: ref } = await supabase
          .from("referrals")
          .select("clicked, token")
          .eq("token", referralToken)
          .single();

        steps.push({
          name: "6. Send referral (send-referral)",
          status: ref && ref.clicked === false ? "PASS" : "FAIL",
          details: `token: ${referralToken?.substring(0, 8)}...`,
          after: { clicked: ref?.clicked },
        });
      } catch (e) {
        steps.push({ name: "6. Send referral (send-referral)", status: "FAIL", details: String(e) });
      }
    }

    // ──────────────────────────────────────────────
    // STEP 8: Confirm referral
    // ──────────────────────────────────────────────
    if (referralToken) {
      try {
        const beforeRef = await supabase
          .from("referrals")
          .select("clicked")
          .eq("token", referralToken)
          .single();

        const { status, data } = await callFn("confirm-referral", { token: referralToken });

        if (status !== 200 || !data.success) throw new Error(JSON.stringify(data));

        const afterRef = await supabase
          .from("referrals")
          .select("clicked")
          .eq("token", referralToken)
          .single();

        steps.push({
          name: "7. Confirm referral (confirm-referral)",
          status: afterRef.data?.clicked === true ? "PASS" : "FAIL",
          details: "Referral link confirmed",
          before: { clicked: beforeRef.data?.clicked },
          after: { clicked: afterRef.data?.clicked },
        });
      } catch (e) {
        steps.push({ name: "7. Confirm referral (confirm-referral)", status: "FAIL", details: String(e) });
      }
    }

    // ──────────────────────────────────────────────
    // STEP 9: Verify referral unlock on report
    // Note: confirm-referral doesn't auto-unlock the report,
    // so we simulate the unlock here to test the flow
    // ──────────────────────────────────────────────
    if (reportId) {
      try {
        await supabase
          .from("reports")
          .update({ unlocked_by_referral: true, referral_unlocked_at: new Date().toISOString() })
          .eq("id", reportId);

        const { data } = await callFn("get-report", { report_id: reportId });
        steps.push({
          name: "8. Referral unlock → full report access",
          status: data.access === "full" ? "PASS" : "FAIL",
          details: `access: ${data.access}`,
        });
      } catch (e) {
        steps.push({ name: "8. Referral unlock → full report access", status: "FAIL", details: String(e) });
      }
    }

    // ──────────────────────────────────────────────
    // CLEANUP: Remove test data
    // ──────────────────────────────────────────────
    try {
      if (reportId) {
        await supabase.from("payments").delete().eq("report_id", reportId);
        await supabase.from("reports").delete().eq("id", reportId);
      }
      if (leadId) {
        await supabase.from("referrals").delete().eq("lead_id", leadId);
        await supabase.from("leads").delete().eq("id", leadId);
      }
      steps.push({ name: "9. Cleanup test data", status: "PASS", details: "All test records removed" });
    } catch (e) {
      steps.push({ name: "9. Cleanup test data", status: "FAIL", details: String(e) });
    }

    // Summary
    const passed = steps.filter((s) => s.status === "PASS").length;
    const failed = steps.filter((s) => s.status === "FAIL").length;

    return new Response(
      JSON.stringify({
        summary: { total: steps.length, passed, failed },
        steps,
        test_email: testEmail,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message, steps }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
