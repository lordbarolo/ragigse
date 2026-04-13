import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Constants ────────────────────────────────────────────────────────────────

const STORHELG_2026 = [
  "2026-01-01", "2026-01-06",
  "2026-04-03", "2026-04-04", "2026-04-05", "2026-04-06",
  "2026-06-19", "2026-06-20",
  "2026-12-24", "2026-12-25", "2026-12-26", "2026-12-31",
];

const HELGDAG_2026 = [
  "2026-05-01", "2026-05-14", "2026-06-06", "2026-10-31",
];

const OB_SSK: Record<string, number> = {
  vardagkvall: 37,
  vardagnatt: 82,
  helgkvall: 96,
  helgdag: 96,
  helgnatt: 109,
  storhelgDag: 184,
  storhelgNatt: 222,
};

const OB_MULTIPLIKATOR_SSK = 1.3142;

// ── Helpers ──────────────────────────────────────────────────────────────────

function isStorhelg(date: string): boolean {
  return STORHELG_2026.includes(date);
}

function isHelgdag(date: string): boolean {
  const d = new Date(date + "T12:00:00");
  return d.getDay() === 0 || d.getDay() === 6 || HELGDAG_2026.includes(date);
}

function parseTime(t: string): number {
  const [h, m] = (t ?? "0:0").split(":").map(Number);
  return (h || 0) + (m || 0) / 60;
}

function incrementDate(d: string): string {
  if (!d || d.length < 10) return d || "";
  const dt = new Date(d + "T12:00:00");
  if (isNaN(dt.getTime())) return d;
  dt.setDate(dt.getDate() + 1);
  return dt.toISOString().slice(0, 10);
}

function getOBTillagg(datum: string, timme: number): number {
  if (isStorhelg(datum)) {
    return (timme >= 22 || timme < 7) ? OB_SSK.storhelgNatt : OB_SSK.storhelgDag;
  }
  if (isHelgdag(datum)) {
    if (timme >= 22 || timme < 6) return OB_SSK.helgnatt;
    if (timme >= 19) return OB_SSK.helgkvall;
    return OB_SSK.helgdag;
  }
  if (timme >= 22 || timme < 6) return OB_SSK.vardagnatt;
  const dayNr = new Date(datum + "T12:00:00").getDay();
  if (timme >= 19 && dayNr >= 1 && dayNr <= 4) return OB_SSK.vardagkvall;
  return 0;
}

function isSjukskoterska(yrke: string): boolean {
  const y = (yrke ?? "").toLowerCase();
  return y.includes("sjuksköterska") || y.includes("barnmorska");
}

// ── Interfaces ───────────────────────────────────────────────────────────────

interface TimerapportRad {
  datum: string;
  start_tid: string;
  slut_tid: string;
  typ: string;
  rast_minuter: number;
}

interface FakturaRad {
  beskrivning: string;
  antal_timmar: number;
  a_pris: number;
  summa: number;
  typ: string;
}

interface Avvikelse {
  kod: string;
  datum: string;
  beskrivning: string;
  belopp: number;
}

// ── Rule engine ──────────────────────────────────────────────────────────────

function runRuleEngine(
  tidrapportRader: TimerapportRad[],
  fakturaRader: FakturaRad[],
  grundpris: number,
  yrkeskategori: string,
): { avvikelser: Avvikelse[]; totalForvantad: number; fakturerad: number } {
  const avvikelser: Avvikelse[] = [];
  let totalForvantad = 0;
  const isSsk = isSjukskoterska(yrkeskategori);

  // Calculate expected per shift
  for (const rad of tidrapportRader) {
    if (!rad.datum || !rad.start_tid || !rad.slut_tid) continue;
    let startH = parseTime(rad.start_tid);
    let slutH = parseTime((rad.slut_tid ?? "").replace("+1", ""));
    if ((rad.slut_tid ?? "").includes("+1") || slutH < startH) slutH += 24;

    const rastTimmar = (rad.rast_minuter || 0) / 60;
    const bruttoTimmar = slutH - startH;
    const nettoTimmar = Math.max(0, bruttoTimmar - rastTimmar);

    if (rad.typ === "jour" || rad.typ === "beredskap") {
      totalForvantad += nettoTimmar * grundpris * 2.0;
      continue;
    }

    // Ordinarie: timme-för-timme OB
    let shiftTotal = 0;
    const obTimmar: { timme: number; ob: number; datum: string }[] = [];

    for (let h = Math.floor(startH); h < Math.ceil(slutH); h++) {
      const actualH = h % 24;
      const datumForH = h >= 24 ? incrementDate(rad.datum) : rad.datum;
      const obRaw = getOBTillagg(datumForH, actualH);
      const ob = isSsk ? Math.round(obRaw * OB_MULTIPLIKATOR_SSK) : obRaw;
      shiftTotal += grundpris + ob;
      if (ob > 0) obTimmar.push({ timme: actualH, ob, datum: datumForH });
    }

    const factor = nettoTimmar / bruttoTimmar;
    shiftTotal *= factor;
    totalForvantad += Math.round(shiftTotal);

    // A3: Check missing OB
    for (const obt of obTimmar) {
      const hasOBInFaktura = fakturaRader.some(
        (fr) => fr.typ === "ob_tillagg",
      );
      if (!hasOBInFaktura && obt.ob >= 82) {
        avvikelser.push({
          kod: "A3",
          datum: rad.datum,
          beskrivning: `OB-tillägg kan saknas kl ${obt.timme}:00 (+${obt.ob} kr/tim)`,
          belopp: obt.ob,
        });
        break; // One flag per shift
      }
    }
  }

  // A1: Hour mismatch
  const tidrapportTimmar = tidrapportRader.reduce((sum, r) => {
    const s = parseTime(r.start_tid);
    let e = parseTime(r.slut_tid.replace("+1", ""));
    if (r.slut_tid.includes("+1") || e < s) e += 24;
    return sum + (e - s - (r.rast_minuter || 0) / 60);
  }, 0);

  const grundprisRader = fakturaRader.filter((r) => r.typ === "grundpris");
  const fakturaTimmar = grundprisRader.reduce((s, r) => s + (r.antal_timmar ?? 0), 0);

  if (Math.abs(tidrapportTimmar - fakturaTimmar) > 0.25) {
    avvikelser.push({
      kod: "A1",
      datum: "",
      beskrivning: `Tidrapport: ${tidrapportTimmar.toFixed(1)}h, Faktura: ${fakturaTimmar.toFixed(1)}h (diff ${(tidrapportTimmar - fakturaTimmar).toFixed(1)}h)`,
      belopp: Math.round((tidrapportTimmar - fakturaTimmar) * grundpris),
    });
  }

  // A4: Rate mismatch
  for (const gr of grundprisRader) {
    if (gr.a_pris && Math.abs(gr.a_pris - grundpris) > 1) {
      avvikelser.push({
        kod: "A4",
        datum: "",
        beskrivning: `Fel timpris: fakturerat ${gr.a_pris} kr/tim, ditt avtal anger ${grundpris} kr/tim`,
        belopp: 0,
      });
      break;
    }
  }

  // Total fakturerad
  const fakturerad = fakturaRader.reduce((s, r) => s + (r.summa ?? 0), 0);

  // A2: Total amount deviation
  const differens = totalForvantad - fakturerad;
  if (Math.abs(differens) > 500) {
    avvikelser.push({
      kod: "A2",
      datum: "",
      beskrivning: `Förväntat: ${totalForvantad} kr, Fakturerat: ${Math.round(fakturerad)} kr (diff ${Math.round(differens)} kr)`,
      belopp: Math.round(differens),
    });
  }

  return { avvikelser, totalForvantad: Math.round(totalForvantad), fakturerad: Math.round(fakturerad) };
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { review_id } = await req.json();
    if (!review_id) throw new Error("review_id is required");

    const { data: review, error: reviewErr } = await supabase
      .from("invoice_reviews")
      .select("*")
      .eq("id", review_id)
      .single();
    if (reviewErr || !review) throw new Error("Review not found: " + reviewErr?.message);

    await supabase.from("invoice_reviews").update({ status: "analyzing" }).eq("id", review_id);

    // Get data
    const tidrapportRader = (review.confirmed_tidrapport ?? review.extracted_tidrapport?.rader ?? []) as TimerapportRad[];
    const fakturaRader = (review.extracted_faktura?.rader ?? []) as FakturaRad[];
    const grundpris = review.grundpris as number;
    const yrkeskategori = (review.yrkeskategori ?? "") as string;

    if (!grundpris || grundpris <= 0) throw new Error("Grundpris saknas");

    // Run rule engine
    const { avvikelser, totalForvantad, fakturerad } = runRuleEngine(
      tidrapportRader,
      fakturaRader,
      grundpris,
      yrkeskategori,
    );

    const harAvvikelse = avvikelser.length > 0;

    // Save results — always pending_review, admin must approve
    await supabase.from("invoice_reviews").update({
      status: "pending_review",
      avvikelser,
      forvantad_summa: totalForvantad,
      fakturerad_summa: fakturerad,
      differens: totalForvantad - fakturerad,
      har_avvikelse: harAvvikelse,
    }).eq("id", review_id);

    // Notify admin for ALL reviews (not just deviations)
    {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (RESEND_API_KEY && LOVABLE_API_KEY) {
        try {
          const subject = harAvvikelse
            ? `⚠️ Avvikelse hittad — granskning ${review_id}`
            : `✅ Ny granskning klar — ${review_id}`;
          const html = harAvvikelse
            ? `<h2>Fakturaavvikelse</h2>
                <p><strong>Antal avvikelser:</strong> ${avvikelser.length}</p>
                <p><strong>Diff:</strong> ${totalForvantad - fakturerad} kr</p>
                <ul>${avvikelser.map((a) => `<li>[${a.kod}] ${a.beskrivning}</li>`).join("")}</ul>
                <p><a href="https://compcare.se/admin">Granska i admin</a></p>`
            : `<h2>Granskning utan avvikelse</h2>
                <p><strong>Förväntat:</strong> ${totalForvantad} kr</p>
                <p><strong>Fakturerat:</strong> ${fakturerad} kr</p>
                <p>Inga avvikelser hittades. Väntar på ditt godkännande.</p>
                <p><a href="https://compcare.se/admin">Granska i admin</a></p>`;
          await fetch("https://connector-gateway.lovable.dev/resend/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": RESEND_API_KEY,
            },
            body: JSON.stringify({
              from: "CompCare <noreply@mail.compcare.se>",
              to: ["halvarholding@gmail.com"],
              subject,
              html,
            }),
          });
          await supabase.from("invoice_reviews").update({ notis_skickad: true }).eq("id", review_id);
        } catch (e) {
          console.error("Email failed:", e);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, har_avvikelse: harAvvikelse, avvikelser }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("invoice-analyzer error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    try {
      const body = await req.clone().json();
      if (body?.review_id) {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from("invoice_reviews").update({
          status: "error",
          error_message: message,
        }).eq("id", body.review_id);
      }
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
