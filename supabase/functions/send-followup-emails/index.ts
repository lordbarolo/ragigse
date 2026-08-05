import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { requireCronOrAdmin } from "../_shared/cronAuth.ts";
import { fromAddress } from "../_shared/mailFrom.ts";


const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://vardbemanning.ai";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailTemplate {
  subject: string;
  html: string;
}

function getEmailTemplate(step: number, occupation: string, reportUrl: string): EmailTemplate {
  const templates: Record<number, EmailTemplate> = {
    1: {
      subject: `Tips inför din förhandling som ${occupation}`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e; line-height: 1.6;">
          <div style="background: linear-gradient(135deg, #0f1729, #1a2040); padding: 24px 28px; border-radius: 12px 12px 0 0;">
            <span style="color: #38bdf8; font-weight: 700; font-size: 18px;">vårdbemanning.ai</span>
          </div>
          <div style="padding: 28px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="margin: 0 0 16px; color: #1a1a2e; font-size: 18px;">3 tips inför din nästa förhandling</h2>
            <p>Hej! Du gjorde nyligen en ersättningsanalys för <strong>${occupation}</strong>. Här är tre konkreta tips:</p>
            <ol style="padding-left: 20px;">
              <li style="margin-bottom: 10px;"><strong>Hänvisa till ramavtalet</strong> — Kundpriset är offentligt och ger dig ett starkt förhandlingsunderlag.</li>
              <li style="margin-bottom: 10px;"><strong>Fråga om marginalen</strong> — Be ditt bemanningsföretag specificera vad som ingår i deras marginal.</li>
              <li style="margin-bottom: 10px;"><strong>Jämför zoner</strong> — Timpriset varierar mellan zoner. En flytt kan ge betydligt högre ersättning.</li>
            </ol>
            <p style="margin: 20px 0;">
              <a href="${reportUrl}" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #38bdf8, #0d9488); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Se din rapport igen</a>
            </p>
            <p style="color: #888; font-size: 13px;">Lycka till!<br/>Teamet på vårdbemanning.ai</p>
          </div>
        </div>
      `,
    },
    2: {
      subject: "Hur gick din förhandling?",
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e; line-height: 1.6;">
          <div style="background: linear-gradient(135deg, #0f1729, #1a2040); padding: 24px 28px; border-radius: 12px 12px 0 0;">
            <span style="color: #38bdf8; font-weight: 700; font-size: 18px;">vårdbemanning.ai</span>
          </div>
          <div style="padding: 28px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="margin: 0 0 16px; color: #1a1a2e; font-size: 18px;">Har du hunnit förhandla?</h2>
            <p>Det har gått en vecka sedan du fick din ersättningsanalys. Vi vill gärna veta hur det gick!</p>
            <p>Många av våra användare har lyckats förhandla upp sin ersättning med <strong>10–25%</strong> med hjälp av ramavtalsdata.</p>
            <p>Om du inte hunnit ännu — ingen stress. Din rapport finns kvar:</p>
            <p style="margin: 20px 0;">
              <a href="${reportUrl}" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #38bdf8, #0d9488); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Öppna din rapport</a>
            </p>
            <p style="color: #888; font-size: 13px;">Hälsningar,<br/>Teamet på vårdbemanning.ai</p>
          </div>
        </div>
      `,
    },
    3: {
      subject: "Ny avtalsdata tillgänglig — gör en uppdaterad analys",
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e; line-height: 1.6;">
          <div style="background: linear-gradient(135deg, #0f1729, #1a2040); padding: 24px 28px; border-radius: 12px 12px 0 0;">
            <span style="color: #38bdf8; font-weight: 700; font-size: 18px;">vårdbemanning.ai</span>
          </div>
          <div style="padding: 28px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="margin: 0 0 16px; color: #1a1a2e; font-size: 18px;">Dags att uppdatera din analys?</h2>
            <p>Det har gått ett par veckor sedan din senaste ersättningsanalys som <strong>${occupation}</strong>.</p>
            <p>Ramavtalspriser uppdateras löpande och nya avtal kan ge dig bättre förhandlingsunderlag. Gör en ny kostnadsfri analys för att se om det finns utrymme att höja din ersättning ytterligare.</p>
            <p style="margin: 20px 0;">
              <a href="${APP_BASE_URL}" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #38bdf8, #0d9488); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Gör en ny analys</a>
            </p>
            <p style="color: #888; font-size: 13px;">Hälsningar,<br/>Teamet på vårdbemanning.ai</p>
          </div>
        </div>
      `,
    },
  };

  return templates[step] || templates[1];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const authError = await requireCronOrAdmin(req);
  if (authError) return authError;


  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const resendApiKey = Deno.env.get("RESEND_API_KEY_1");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY_1 not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch pending emails that are due
    const { data: pendingEmails, error: fetchError } = await supabase
      .from("followup_emails")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return new Response(JSON.stringify({ error: "Failed to fetch pending emails" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No pending emails" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;
    let errorCount = 0;

    for (const email of pendingEmails) {
      try {
        // Get report info for context
        let occupation = "konsult";
        const reportUrl = `${APP_BASE_URL}/rapport/${email.report_id}`;

        if (email.report_id) {
          const { data: report } = await supabase
            .from("reports")
            .select("occupation")
            .eq("id", email.report_id)
            .maybeSingle();
          if (report?.occupation) occupation = report.occupation;
        }

        const template = getEmailTemplate(email.sequence_step, occupation, reportUrl);

        const resendRes = await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "X-Connection-Api-Key": resendApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromAddress(),
            to: [email.email],
            subject: template.subject,
            html: template.html,
          }),
        });

        if (resendRes.ok) {
          // Mark as sent
          await supabase
            .from("followup_emails")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", email.id);
          sentCount++;
          console.log(`Sent step ${email.sequence_step} email (id=${email.id})`);
        } else {
          const errBody = await resendRes.text();
          console.error(`Resend error for followup id=${email.id}: ${errBody}`);
          await supabase
            .from("followup_emails")
            .update({ status: "failed" })
            .eq("id", email.id);
          errorCount++;
        }
      } catch (emailErr) {
        console.error(`Error sending to ${email.email}:`, emailErr);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({ sent: sentCount, errors: errorCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send followup error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
