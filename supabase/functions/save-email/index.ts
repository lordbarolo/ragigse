import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    // Rate limit: 10 save-email requests per IP per hour
    const rlSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const rl = await checkRateLimit(rlSupabase, "save-email", clientIp, 10, 60);
    if (!rl.allowed) {
      console.log(`[RATE_LIMIT] save-email blocked | ip=${clientIp} | count=${rl.count}`);
      return rateLimitResponse(rl, corsHeaders);
    }

    const body = await req.json();
    const { lead_id, report_id, email } = body;

    // Audit logging
    console.log(`[AUDIT] save-email | ip=${clientIp} | email=${email} | lead_id=${lead_id || "none"} | report_id=${report_id || "none"}`);

    if (!lead_id || !email) {
      return new Response(
        JSON.stringify({ error: "Missing lead_id or email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Update lead with email (existing behavior)
    const { error: leadError } = await supabase
      .from("leads")
      .update({ email })
      .eq("id", lead_id);

    if (leadError) {
      console.error("Failed to update lead email:", leadError);
      return new Response(
        JSON.stringify({ error: "Failed to save email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Update report with email if report_id provided
    if (report_id) {
      await supabase
        .from("reports")
        .update({ email })
        .eq("id", report_id);
    }

    // 3. Silent signup — create auth user (or find existing)
    let userId: string | null = null;

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      userId = existingUser.id;
      console.log(`Existing auth user found: ${userId}`);
    } else {
      // Create new auth user with auto-confirm (no password, magic-link only)
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: email.toLowerCase(),
        email_confirm: true,
        user_metadata: { source: "save-email", lead_id },
      });

      if (createErr) {
        console.error("Failed to create auth user:", createErr);
        // Non-fatal: continue without auth user
      } else {
        userId = newUser.user.id;
        console.log(`Auth user created: ${userId}`);
      }
    }

    // 4. Create consultant_profiles from lead data (if auth user exists)
    if (userId) {
      // Fetch lead data for profile enrichment
      const { data: leadData } = await supabase
        .from("leads")
        .select("yrke, kommun, employment_type, experience, current_salary, salary_type")
        .eq("id", lead_id)
        .single();

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from("consultant_profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (!existingProfile && leadData) {
        // Look up specialty_id from lead's yrke
        let specialtyId: string | null = null;
        if (leadData.yrke) {
          const { data: spec } = await supabase
            .from("specialties")
            .select("id")
            .eq("name", leadData.yrke)
            .limit(1)
            .single();
          specialtyId = spec?.id || null;
        }

        // Look up region_id from lead's kommun
        let regionId: string | null = null;
        if (leadData.kommun) {
          const { data: reg } = await supabase
            .from("regions")
            .select("id")
            .eq("kommun", leadData.kommun)
            .limit(1)
            .single();
          regionId = reg?.id || null;
        }

        const { error: profileErr } = await supabase
          .from("consultant_profiles")
          .insert({
            user_id: userId,
            specialty_id: specialtyId,
            region_id: regionId,
            employment_type: leadData.employment_type || null,
            experience_years: leadData.experience || null,
            current_hourly_rate: leadData.salary_type === "hourly" ? leadData.current_salary : null,
            current_monthly_salary: leadData.salary_type === "monthly" ? leadData.current_salary : null,
            salary_type: leadData.salary_type || null,
            onboarding_step: 1,
          });

        if (profileErr) {
          console.error("Failed to create consultant profile:", profileErr);
        } else {
          console.log(`Consultant profile created for user ${userId}`);
        }
      }

      // 5. Link report to auth user and consultant profile
      if (report_id) {
        // Get consultant_profile_id for this user
        const { data: cpData } = await supabase
          .from("consultant_profiles")
          .select("id")
          .eq("user_id", userId)
          .single();

        await supabase
          .from("reports")
          .update({
            user_id: userId,
            consultant_profile_id: cpData?.id || null,
          })
          .eq("id", report_id);
      }

      // 6. Generate magic link for report email
      const siteUrl = Deno.env.get("SUPABASE_URL")!.replace(".supabase.co", "").replace("https://", "");
      const reportUrl = report_id
        ? `https://compcare.lovable.app/rapport/${report_id}`
        : `https://compcare.lovable.app/resultat/${lead_id}`;

      const { data: magicLinkData, error: magicErr } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: email.toLowerCase(),
        options: { redirectTo: reportUrl },
      });

      if (magicErr) {
        console.error("Failed to generate magic link:", magicErr);
      }

      const magicLink = magicLinkData?.properties?.action_link || null;

      // 7. Send report email with magic link
      if (report_id && magicLink) {
        try {
          await sendReportEmail(supabase, email, report_id, magicLink);
        } catch (emailErr) {
          console.error("Failed to send report email:", emailErr);
          // Non-fatal: user still sees report in-app
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, user_id: userId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Save email error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendReportEmail(
  supabase: any,
  email: string,
  reportId: string,
  magicLink: string
) {
  // Fetch report data for email content
  const { data: report } = await supabase
    .from("reports")
    .select("occupation, kommun, result_json")
    .eq("id", reportId)
    .single();

  const occupation = report?.occupation || "din roll";
  const kommun = report?.kommun || "";
  const resultJson = report?.result_json;

  // Build summary for email
  let summaryHtml = "";
  if (resultJson?.track === "consultant" && resultJson?.recommendation) {
    const rec = resultJson.recommendation;
    summaryHtml = `
      <p style="margin:0 0 8px"><strong>Rekommenderad timlön:</strong> ${Math.round(rec.recommended_hourly_min)}–${Math.round(rec.recommended_hourly_max)} kr/h</p>
      <p style="margin:0 0 8px"><strong>Rekommenderad månadslön:</strong> ${Math.round(rec.recommended_monthly_min).toLocaleString("sv-SE")}–${Math.round(rec.recommended_monthly_max).toLocaleString("sv-SE")} kr</p>
    `;
  } else if (resultJson?.track === "permanent" && resultJson?.market) {
    const mkt = resultJson.market;
    summaryHtml = `
      <p style="margin:0 0 8px"><strong>Marknadens median:</strong> ${(mkt.percentile_50 || mkt.average_monthly || 0).toLocaleString("sv-SE")} kr/mån</p>
      <p style="margin:0 0 8px"><strong>Topp 25%:</strong> ${(mkt.percentile_75 || 0).toLocaleString("sv-SE")} kr/mån</p>
    `;
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.error("RESEND_API_KEY not configured");
    return;
  }

  const html = `
<!DOCTYPE html>
<html lang="sv">
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#ffffff;margin:0;padding:0">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <h1 style="font-size:22px;color:#0f172a;margin:0 0 16px">Din ersättningsanalys är klar</h1>
    
    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px">
      Hej! Här är din personliga ersättningsanalys för <strong>${occupation}</strong>${kommun ? ` i ${kommun}` : ""}.
    </p>

    ${summaryHtml ? `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:0 0 24px">
      ${summaryHtml}
    </div>
    ` : ""}

    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px">
      Klicka nedan för att se din fullständiga rapport med förhandlingsscript och strategiska råd.
    </p>

    <a href="${magicLink}" style="display:inline-block;background:#0891b2;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600">
      Öppna min rapport →
    </a>

    <p style="color:#94a3b8;font-size:13px;margin:24px 0 0;line-height:1.5">
      Länken loggar in dig automatiskt och är giltig i 24 timmar.<br>
      Du kan alltid begära en ny länk via compcare.se.
    </p>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 16px">
    <p style="color:#94a3b8;font-size:12px;margin:0">
      CompCare — Ersättningsanalys för vårdkonsulter
    </p>
  </div>
</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "CompCare <noreply@mail.compcare.se>",
      to: [email],
      subject: `Din ersättningsanalys — ${occupation}${kommun ? `, ${kommun}` : ""}`,
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Resend error:", errText);
    throw new Error(`Resend failed: ${res.status}`);
  }

  const resData = await res.json();
  console.log(`Report email sent to ${email}, Resend ID: ${resData.id}`);
}
