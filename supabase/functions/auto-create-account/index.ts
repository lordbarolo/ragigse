import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { lead_id, report_id, email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Missing email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create user with random password (magic link only)
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
      });

      if (createError || !newUser?.user) {
        console.error("Failed to create user:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;
    }

    // 2. Update lead with email
    if (lead_id) {
      await supabase.from("leads").update({ email }).eq("id", lead_id);
    }

    // 3. Update report with email + user_id
    let reportData: { occupation?: string; kommun?: string; employment_type?: string; current_salary?: number; result_json?: any } | null = null;
    if (report_id) {
      await supabase
        .from("reports")
        .update({ email, user_id: userId })
        .eq("id", report_id);

      // Fetch report for analysis record + email
      const { data: rpt } = await supabase
        .from("reports")
        .select("occupation, kommun, employment_type, current_salary, result_json")
        .eq("id", report_id)
        .maybeSingle();
      reportData = rpt;
    }

    // 4. Create analysis record
    if (reportData) {
      await supabase.from("analyses").insert({
        user_id: userId,
        role: reportData.occupation || null,
        location: reportData.kommun || null,
        employment_type: reportData.employment_type || null,
        current_salary: reportData.current_salary || null,
        result_data: reportData.result_json || null,
      });
    }

    // 5. Send email with magic link via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const siteUrl = "https://compcare.se";

      const { data: linkData } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: `${siteUrl}/mina-analyser`,
        },
      });

      const magicLink = linkData?.properties?.action_link || siteUrl;
      const reportLink = report_id ? `${siteUrl}/rapport/${report_id}` : siteUrl;

      let summaryHtml = "";
      if (reportData) {
        summaryHtml = `
        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0 0 4px; color: #374151;"><strong>Roll:</strong> ${reportData.occupation || "–"}</p>
          <p style="margin: 0 0 4px; color: #374151;"><strong>Ort:</strong> ${reportData.kommun || "–"}</p>
          <p style="margin: 0; color: #374151;"><strong>Typ:</strong> ${reportData.employment_type === "foretagare" ? "Eget bolag" : "Anställd"}</p>
        </div>`;
      }

      const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #ffffff; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto;">
    <h1 style="font-size: 22px; color: #111827; margin-bottom: 16px;">Din CompCare-analys är klar ✅</h1>
    ${summaryHtml}
    <p style="color: #374151; line-height: 1.6; margin-bottom: 24px;">
      Din ersättningsanalys finns redo att läsas. Klicka nedan för att se den.
    </p>
    <a href="${reportLink}" style="display: inline-block; background: #111827; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-bottom: 16px;">
      Se din analys
    </a>
    <p style="color: #6b7280; font-size: 14px; margin-top: 24px; line-height: 1.5;">
      Vill du komma tillbaka senare? Klicka på länken nedan så loggas du in direkt:
    </p>
    <a href="${magicLink}" style="display: inline-block; background: #f3f4f6; color: #111827; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px; margin-top: 8px;">
      Öppna mina analyser →
    </a>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
    <p style="color: #9ca3af; font-size: 12px;">
      © ${new Date().getFullYear()} CompCare.se · Du får detta mail för att du använde CompCare.
    </p>
  </div>
</body>
</html>`;

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "CompCare <noreply@mail.compcare.se>",
            to: [email],
            subject: "Din CompCare-analys är klar ✅",
            html: emailHtml,
          }),
        });
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, user_id: userId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auto-create account error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
