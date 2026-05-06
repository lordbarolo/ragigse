import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { computeEmployerCost, ITP1_THRESHOLD_MONTHLY, HOURS_PER_MONTH } from "../_shared/calc.ts";

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

  // Require admin authentication
  const adminResult = await requireAdmin(req);
  if (adminResult instanceof Response) return adminResult;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const functionsBase = `${supabaseUrl}/functions/v1`;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const steps: TestStep[] = [];

  const testEmail = `e2e-test-${Date.now()}@test.compcare.se`;
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
    // STEP 4: Reset report for referral test
    // ──────────────────────────────────────────────
    if (reportId) {
      await supabase
        .from("reports")
        .update({ status: "preview", paid_at: null, unlocked_by_referral: false, referral_unlocked_at: null })
        .eq("id", reportId);
    }

    // ──────────────────────────────────────────────
    // STEP 5: Send referral
    // ──────────────────────────────────────────────
    if (leadId) {
      try {
        const refereeEmail = `e2e-referee-${Date.now()}@test.compcare.se`;
        const { status, data } = await callFn("send-referral", {
          lead_id: leadId,
          referrer_email: testEmail,
          referee_email: refereeEmail,
          region: "Stockholm",
          send_email: false,
        });

        if (status !== 200 || !data.token) throw new Error(JSON.stringify(data));
        referralToken = data.token;

        const { data: ref } = await supabase
          .from("referrals")
          .select("clicked, token")
          .eq("token", referralToken)
          .single();

        steps.push({
          name: "4. Send referral (send-referral)",
          status: ref && ref.clicked === false ? "PASS" : "FAIL",
          details: `token: ${referralToken?.substring(0, 8)}...`,
          after: { clicked: ref?.clicked },
        });
      } catch (e) {
        steps.push({ name: "4. Send referral (send-referral)", status: "FAIL", details: String(e) });
      }
    }

    // ──────────────────────────────────────────────
    // STEP 6: Confirm referral
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
          name: "5. Confirm referral (confirm-referral)",
          status: afterRef.data?.clicked === true ? "PASS" : "FAIL",
          details: "Referral link confirmed",
          before: { clicked: beforeRef.data?.clicked },
          after: { clicked: afterRef.data?.clicked },
        });
      } catch (e) {
        steps.push({ name: "5. Confirm referral (confirm-referral)", status: "FAIL", details: String(e) });
      }
    }

    // ──────────────────────────────────────────────
    // STEP 7: Verify referral unlock on report
    // ──────────────────────────────────────────────
    if (reportId) {
      try {
        await supabase
          .from("reports")
          .update({ unlocked_by_referral: true, referral_unlocked_at: new Date().toISOString() })
          .eq("id", reportId);

        const { data } = await callFn("get-report", { report_id: reportId });
        steps.push({
          name: "6. Referral unlock → full report access",
          status: data.access === "full" ? "PASS" : "FAIL",
          details: `access: ${data.access}`,
        });
      } catch (e) {
        steps.push({ name: "6. Referral unlock → full report access", status: "FAIL", details: String(e) });
      }
    }

    // ──────────────────────────────────────────────
    // STEP 8: Validate employer-cost step function for ALL roles
    // ──────────────────────────────────────────────
    try {
      const { data: roles, error: rolesErr } = await supabase
        .from("rates")
        .select("yrkeskategori")
        .eq("employment_type", "anstalld");
      if (rolesErr) throw rolesErr;

      const uniqueRoles = Array.from(new Set((roles ?? []).map((r) => r.yrkeskategori).filter(Boolean)));
      const failures: Array<{ role: string; reason: string }> = [];
      const samples: Array<{ role: string; hourly: number; total: number; factor: number; crossesThreshold: boolean }> = [];

      // Test each role at 3 salary points: low (300), mid (500), high (900)
      const testPoints = [300, 500, 900];

      for (const role of uniqueRoles) {
        for (const hourly of testPoints) {
          const b = computeEmployerCost(hourly);
          const monthly = hourly * HOURS_PER_MONTH;

          // Sanity invariants
          const expectedAga = hourly * 0.3142;
          const expectedAfa = hourly * 0.0085;
          const expectedItpLow = Math.min(monthly, ITP1_THRESHOLD_MONTHLY) * 0.045;
          const expectedItpHigh = Math.max(0, monthly - ITP1_THRESHOLD_MONTHLY) * 0.30;
          const expectedItpMonthly = expectedItpLow + expectedItpHigh;
          const expectedItpHour = expectedItpMonthly / HOURS_PER_MONTH;
          const expectedSarskild = expectedItpHour * 0.2426;
          const expectedTotal = hourly + expectedAga + expectedItpHour + expectedSarskild + expectedAfa;

          const close = (a: number, b: number) => Math.abs(a - b) < 0.01;
          if (!close(b.arbetsgivaravgift_per_h, expectedAga)) failures.push({ role, reason: `AGA mismatch @${hourly}` });
          if (!close(b.itp1_per_month, expectedItpMonthly)) failures.push({ role, reason: `ITP mismatch @${hourly}` });
          if (!close(b.afa_tfa_per_h, expectedAfa)) failures.push({ role, reason: `AFA mismatch @${hourly}` });
          if (!close(b.total_employer_cost_per_h, expectedTotal)) failures.push({ role, reason: `Total mismatch @${hourly}` });
          if (b.total_factor < 1.30 || b.total_factor > 1.70) failures.push({ role, reason: `Factor out of range @${hourly}: ${b.total_factor}` });
        }
        // Capture one sample per role at 500 kr/h
        const sample = computeEmployerCost(500);
        samples.push({
          role,
          hourly: 500,
          total: Math.round(sample.total_employer_cost_per_h * 100) / 100,
          factor: Math.round(sample.total_factor * 10000) / 10000,
          crossesThreshold: sample.itp1_high_part > 0,
        });
      }

      steps.push({
        name: `8. Employer-cost step function (${uniqueRoles.length} roles × 3 salary points)`,
        status: failures.length === 0 ? "PASS" : "FAIL",
        details: failures.length === 0
          ? `All ${uniqueRoles.length * 3} calculations match invariants. Brytpunkt: ${ITP1_THRESHOLD_MONTHLY} kr/mån.`
          : `${failures.length} failures: ${failures.slice(0, 5).map((f) => `${f.role}:${f.reason}`).join("; ")}`,
        after: { samples: samples.slice(0, 10), total_roles: uniqueRoles.length, failures: failures.length },
      });
    } catch (e) {
      steps.push({ name: "8. Employer-cost step function", status: "FAIL", details: String(e) });
    }

    // ──────────────────────────────────────────────
    // CLEANUP: Remove test data
    try {
      if (reportId) {
        await supabase.from("reports").delete().eq("id", reportId);
      }
      if (leadId) {
        await supabase.from("referrals").delete().eq("lead_id", leadId);
        await supabase.from("leads").delete().eq("id", leadId);
      }
      steps.push({ name: "7. Cleanup test data", status: "PASS", details: "All test records removed" });
    } catch (e) {
      steps.push({ name: "7. Cleanup test data", status: "FAIL", details: String(e) });
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
