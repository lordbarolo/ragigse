import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
import { maskEmail } from "../_shared/maskEmail.ts";

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
    console.log(`[AUDIT] save-email | ip=${clientIp} | email=${maskEmail(email)} | lead_id=${lead_id || "none"} | report_id=${report_id || "none"}`);

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

    // SECURITY: prevent lead-email takeover. A save-email call may only set the
    // email on a lead that does NOT yet have one (or already has the same email).
    // If the lead already has a *different* email, require the caller to be
    // authenticated as that email.
    const { data: existingLead, error: leadFetchError } = await supabase
      .from("leads")
      .select("id, email")
      .eq("id", lead_id)
      .maybeSingle();

    if (leadFetchError || !existingLead) {
      console.error("Lead lookup failed:", leadFetchError);
      return new Response(
        JSON.stringify({ error: "Lead not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existingEmail = existingLead.email ? String(existingLead.email).toLowerCase().trim() : null;
    const leadHasDifferentEmail = !!existingEmail && existingEmail !== normalizedEmail;

    if (leadHasDifferentEmail) {
      // Require the caller to be authenticated as the existing lead email.
      const authHeader = req.headers.get("Authorization");
      let callerEmail: string | null = null;
      if (authHeader?.startsWith("Bearer ")) {
        const anonClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: userData } = await anonClient.auth.getUser();
        callerEmail = userData?.user?.email?.toLowerCase() ?? null;
      }
      const ownsByEmail = !!callerEmail && callerEmail === existingEmail;
      if (!ownsByEmail) {
        console.warn(`[SECURITY] save-email takeover attempt blocked | lead_id=${lead_id} | ip=${clientIp}`);
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 1. Update lead with email (existing behavior)
    const { error: leadError } = await supabase
      .from("leads")
      .update({ email: normalizedEmail })
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

    // Check if user already exists (use filter instead of listing all users)
    const { data: existingUsers } = await supabase.auth.admin.listUsers({
      filter: `email.eq.${email.toLowerCase()}`,
      page: 1,
      perPage: 1,
    });
    const existingUser = existingUsers?.users?.[0] || null;

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
        ? `https://compcare.se/rapport/${report_id}`
        : `https://compcare.se/resultat/${lead_id}`;

      const { data: magicLinkData, error: magicErr } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: email.toLowerCase(),
        options: { redirectTo: reportUrl },
      });

      if (magicErr) {
        console.error("Failed to generate magic link:", magicErr);
      }

      const magicLink = magicLinkData?.properties?.action_link || null;

      // 7. Send report email via transactional email system
      if (report_id) {
        try {
          const { data: report } = await supabase
            .from("reports")
            .select("occupation, kommun")
            .eq("id", report_id)
            .single();

          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "report-delivery",
              recipientEmail: email,
              idempotencyKey: `report-delivery-${report_id}`,
              templateData: {
                occupation: report?.occupation || "din roll",
                kommun: report?.kommun || "",
                reportUrl: magicLink || `https://compcare.se/rapport/${report_id}`,
              },
            },
          });
          console.log(`Report email enqueued for ${maskEmail(email)}`);
        } catch (emailErr) {
          console.error("Failed to enqueue report email:", emailErr);
        }
      }
    }

    // SECURITY: never return user_id to unauthenticated callers (prevents email->UUID enumeration)
    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Save email error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
