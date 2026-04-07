import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY_1");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY_1 not configured");
    const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

    const today = new Date().toISOString().split("T")[0];

    // Find pending notifications that are due
    const { data: dueNotifications, error: fetchErr } = await supabase
      .from("radar_notifications")
      .select(`
        id, months_before, scheduled_for,
        watchlist:radar_watchlist!inner(user_id, competence, location, buyer, predicted_date)
      `)
      .eq("status", "pending")
      .lte("scheduled_for", today)
      .is("sent_at", null)
      .limit(50);

    if (fetchErr) throw fetchErr;
    if (!dueNotifications || dueNotifications.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const notif of dueNotifications) {
      const w = notif.watchlist as any;
      
      // Get user email from auth
      const { data: userData } = await supabase.auth.admin.getUserById(w.user_id);
      const email = userData?.user?.email;
      if (!email) continue;

      const monthsText = notif.months_before === 1 ? "1 månad" : `${notif.months_before} månader`;

      // Send email via Resend
      const emailRes = await fetch(`${GATEWAY_URL}/emails`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": RESEND_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "CompCare Radar <noreply@mail.compcare.se>",
          to: [email],
          subject: `🔮 Påminnelse: ${w.competence} hos ${w.buyer} – ${monthsText} kvar`,
          html: `
            <div style="font-family: sans-serif; max-width: 500px;">
              <h2 style="color: #1a1a1a;">Uppdrag kan dyka upp snart</h2>
              <p>Du bevakar <strong>${w.competence}</strong> hos <strong>${w.buyer}</strong> i <strong>${w.location}</strong>.</p>
              <p>Baserat på historiska mönster förväntas ett uppdrag omkring <strong>${w.predicted_date}</strong> — det är ${monthsText} kvar.</p>
              <p style="margin-top: 24px;">
                <a href="https://compcare.se/radar" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  Visa i Radar
                </a>
              </p>
              <p style="color: #888; font-size: 12px; margin-top: 32px;">CompCare · Uppdragsradar</p>
            </div>
          `,
        }),
      });

      if (emailRes.ok) {
        await supabase
          .from("radar_notifications")
          .update({ sent_at: new Date().toISOString(), status: "sent" })
          .eq("id", notif.id);
        sentCount++;
      } else {
        console.error("Resend error:", await emailRes.text());
      }
    }

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("radar-notify error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
