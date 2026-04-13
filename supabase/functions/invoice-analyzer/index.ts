import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Constants ────────────────────────────────────────────────────────────────

const STORHELG_2026 = [
  "2026-01-01","2026-01-06","2026-04-02","2026-04-03","2026-04-05","2026-04-06",
  "2026-05-01","2026-05-14","2026-05-24","2026-06-06","2026-06-19","2026-06-20",
  "2026-10-31","2026-12-24","2026-12-25","2026-12-26","2026-12-31",
];

const PRISER: Record<string, number[]> = {
  "legitimerad sjuksköterska": [616, 660, 715],
  "röntgensjuksköterska": [616, 660, 715],
  "specialistsjuksköterska": [770, 824, 880],
  "barnmorska": [770, 824, 880],
  "anestesisjuksköterska": [770, 824, 880],
  "intensivvårdssjuksköterska": [770, 824, 880],
  "operationssjuksköterska": [770, 824, 880],
  "distriktssjuksköterska": [770, 824, 880],
  "legitimerad läkare": [847, 1040, 1233],
  "specialist läkare": [1238, 1513, 1787],
  "anestesiolog": [1457, 1678, 1953],
  "intensivvårdsläkare": [1457, 1678, 1953],
  "psykiater": [1457, 1678, 1953],
  "rättspsykiater": [1568, 1787, 2062],
  "beroendespecialist": [1568, 1787, 2062],
};

const OB = {
  vardagkvall: 37,
  vardagnatt: 82,
  helgkvall: 96,
  helgdag: 96,
  helgnatt: 109,
  storhelgDag: 184,
  storhelgNatt: 222,
};

const ZONKARTA: Record<string, number> = {
  "stockholm":1,"sollentuna":1,"täby":1,"danderyd":1,"huddinge":1,"södertälje":1,
  "göteborg":1,"borås":1,"alingsås":1,"malmö":1,"lund":1,"helsingborg":1,"ängelholm":1,
  "uppsala":1,"örebro":1,"västerås":1,"linköping":1,"norrköping":1,"jönköping":1,
  "karlstad":2,"gävle":2,"luleå":2,"umeå":2,"sundsvall":2,"östersund":2,"falun":2,
  "kiruna":3,"gällivare":3,"jokkmokk":3,"lycksele":3,"vilhelmina":3,"strömsund":3,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function isStorhelg(date: string): boolean {
  return STORHELG_2026.includes(date);
}

function isHelgdag(date: string): boolean {
  const d = new Date(date + "T12:00:00");
  return d.getDay() === 0 || d.getDay() === 6;
}

function getZoneForOrt(ort: string): number {
  const key = ort.toLowerCase().trim();
  return ZONKARTA[key] ?? 2;
}

function getBaseprice(yrkeskategori: string, zon: number): number {
  const key = yrkeskategori.toLowerCase().trim();
  // Try exact match first, then fuzzy
  for (const [k, prices] of Object.entries(PRISER)) {
    if (key.includes(k) || k.includes(key)) {
      return prices[zon - 1] ?? prices[0];
    }
  }
  return 0;
}

function getOBTillagg(datum: string, timme: number): number {
  if (isStorhelg(datum)) {
    return (timme >= 22 || timme < 7) ? OB.storhelgNatt : OB.storhelgDag;
  }
  if (isHelgdag(datum)) {
    if (timme >= 22 || timme < 6) return OB.helgnatt;
    if (timme >= 19) return OB.helgkvall;
    return OB.helgdag;
  }
  const dayNr = new Date(datum + "T12:00:00").getDay();
  if (timme >= 22 || timme < 6) return OB.vardagnatt;
  if (timme >= 19 && dayNr >= 1 && dayNr <= 4) return OB.vardagkvall;
  return 0;
}

// Parse time like "HH:MM" to hour decimal
function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h + (m || 0) / 60;
}

interface TimerapportRad {
  datum: string;
  start_tid: string;
  slut_tid: string;
  typ: string;
  rast_minuter: number;
}

interface Avvikelse {
  kod: string;
  datum: string;
  beskrivning: string;
  belopp: number;
}

function beraknaForvantadErsattning(
  rad: TimerapportRad,
  baseprice: number,
): { timmar: number; forvantad: number; ob_detaljer: { timme: number; ob: number }[] } {
  let startH = parseTime(rad.start_tid);
  let slutH = parseTime(rad.slut_tid.replace("+1", ""));
  const nextDay = rad.slut_tid.includes("+1");
  if (nextDay || slutH < startH) slutH += 24;

  const rastTimmar = (rad.rast_minuter || 0) / 60;
  const bruttoTimmar = slutH - startH;
  const nettoTimmar = Math.max(0, bruttoTimmar - rastTimmar);

  if (rad.typ === "jour" || rad.typ === "beredskap") {
    // Utfört arbete under jour: ×2.0, ingen OB
    const forvantad = nettoTimmar * baseprice * 2.0;
    return { timmar: nettoTimmar, forvantad, ob_detaljer: [] };
  }

  // Ordinarie: timme-för-timme OB
  let total = 0;
  const ob_detaljer: { timme: number; ob: number }[] = [];

  for (let h = Math.floor(startH); h < Math.ceil(slutH); h++) {
    const actualH = h % 24;
    const datumForH = h >= 24
      ? incrementDate(rad.datum)
      : rad.datum;
    const ob = getOBTillagg(datumForH, actualH);
    total += baseprice + ob;
    ob_detaljer.push({ timme: actualH, ob });
  }

  // Adjust for partial hours and rast
  const factor = nettoTimmar / bruttoTimmar;
  total *= factor;

  return { timmar: nettoTimmar, forvantad: Math.round(total), ob_detaljer };
}

function incrementDate(d: string): string {
  const dt = new Date(d + "T12:00:00");
  dt.setDate(dt.getDate() + 1);
  return dt.toISOString().slice(0, 10);
}

// ── Claude extraction ────────────────────────────────────────────────────────

async function extractWithClaude(
  apiKey: string,
  pdfBase64: string,
  systemPrompt: string,
): Promise<Record<string, unknown>> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
          },
          { type: "text", text: systemPrompt },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API error [${res.status}]: ${body}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude returned no valid JSON");
  return JSON.parse(jsonMatch[0]);
}

const PROMPT_TIDRAPPORT = `Du är ett system som extraherar tidrapportdata från svenska PDF-dokument inom vårdbemanning.

Extrahera EXAKT följande information och returnera ENDAST giltig JSON, ingen annan text.

{
  "konsult_namn": "string",
  "uppdragsgivare": "string",
  "uppdragsort": "string (stad/kommun)",
  "period": "YYYY-MM",
  "rader": [
    {
      "datum": "YYYY-MM-DD",
      "start_tid": "HH:MM",
      "slut_tid": "HH:MM",
      "typ": "ordinarie | jour | beredskap",
      "rast_minuter": 0,
      "kommentar": "string eller null"
    }
  ]
}

Regler:
- Om sluttid är efter midnatt (t.ex. 07:00 nästa dag), sätt datum till startdatum och sluttid till "07:00+1"
- Om typ är oklar, sätt "ordinarie"
- Om rast inte anges, sätt 0
- Returnera ENDAST JSON`;

const PROMPT_FAKTURA = `Du är ett system som extraherar fakturarad-data från svenska fakturor inom vårdbemanning på nationellt hyrbemanningsavtal.

Extrahera EXAKT följande och returnera ENDAST giltig JSON:

{
  "fakturanummer": "string",
  "fakturadatum": "YYYY-MM-DD",
  "leverantor": "string",
  "konsult_namn": "string",
  "region": "string",
  "uppdragsort": "string",
  "period": "YYYY-MM",
  "rader": [
    {
      "artikel_nr": "string eller null",
      "beskrivning": "string",
      "antal_timmar": 0.0,
      "a_pris": 0.0,
      "summa": 0.0,
      "typ": "grundpris | ob_tillagg | jour_beredskap | reseschablon | avdrag | ovrigt"
    }
  ],
  "summa_exkl_moms": 0.0,
  "moms": 0.0,
  "summa_inkl_moms": 0.0
}

Returnera ENDAST JSON.`;

const PROMPT_KONTRAKT = `Du är ett system som extraherar ersättningsvillkor från konsultkontrakt inom svensk vårdbemanning.

Extrahera EXAKT följande och returnera ENDAST giltig JSON:

{
  "bemanningsforetag": "string",
  "konsult_namn": "string",
  "yrkeskategori": "string (t.ex. Legitimerad sjuksköterska, Specialistsjuksköterska anestesi, Specialist läkare)",
  "avtal_typ": "nationellt | privat",
  "uppdragsort": "string",
  "zon": 1,
  "bashourlyrate": 0.0,
  "jour_beredskap_inkluderat": true,
  "avtalad_startdatum": "YYYY-MM-DD",
  "avtalad_slutdatum": "YYYY-MM-DD eller null",
  "ovriga_villkor": "string eller null"
}

Om zon inte framgår explicit, sätt null (systemet slår upp zon via uppdragsort).
Returnera ENDAST JSON.`;

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { review_id } = await req.json();
    if (!review_id) throw new Error("review_id is required");

    // 1. Get review record
    const { data: review, error: reviewErr } = await supabase
      .from("invoice_reviews")
      .select("*")
      .eq("id", review_id)
      .single();
    if (reviewErr || !review) throw new Error("Review not found: " + reviewErr?.message);

    // Update status to processing
    await supabase.from("invoice_reviews").update({ status: "processing" }).eq("id", review_id);

    // 2. Download PDFs from storage
    async function downloadPdf(path: string): Promise<string> {
      const { data, error } = await supabase.storage.from("invoice_reviews").download(path);
      if (error || !data) throw new Error(`Failed to download ${path}: ${error?.message}`);
      const buffer = await data.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      // Convert to base64
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }

    const [fakturaPdf, tidrapportPdf, kontraktPdf] = await Promise.all([
      downloadPdf(review.faktura_path),
      downloadPdf(review.tidrapport_path),
      downloadPdf(review.kontrakt_path),
    ]);

    // 3. Extract data with Claude (parallel)
    const [fakturaData, tidrapportData, kontraktData] = await Promise.all([
      extractWithClaude(ANTHROPIC_API_KEY, fakturaPdf, PROMPT_FAKTURA),
      extractWithClaude(ANTHROPIC_API_KEY, tidrapportPdf, PROMPT_TIDRAPPORT),
      extractWithClaude(ANTHROPIC_API_KEY, kontraktPdf, PROMPT_KONTRAKT),
    ]);

    // Save extracted data
    await supabase.from("invoice_reviews").update({
      faktura_data: fakturaData,
      tidrapport_data: tidrapportData,
      kontrakt_data: kontraktData,
    }).eq("id", review_id);

    // 4. Rule engine
    const kontrakt = kontraktData as Record<string, unknown>;
    const tidrapport = tidrapportData as Record<string, unknown>;
    const faktura = fakturaData as Record<string, unknown>;

    // Determine zone
    const zon = (kontrakt.zon as number) ?? getZoneForOrt(
      (kontrakt.uppdragsort as string) ?? (tidrapport.uppdragsort as string) ?? ""
    );

    // Determine base price — contract is primary source, national rates as fallback
    const yrkeskategori = (kontrakt.yrkeskategori as string) ?? "";
    const kontraktRate = kontrakt.bashourlyrate as number | null;
    const nationalRate = getBaseprice(yrkeskategori, zon);
    const baseprice = (kontraktRate && kontraktRate > 0) ? kontraktRate : nationalRate;
    const rateSource = (kontraktRate && kontraktRate > 0) ? "kontrakt" : "nationellt_avtal";

    const avvikelser: Avvikelse[] = [];
    let totalForvantad = 0;

    // Process each timesheet row
    const rader = (tidrapport.rader ?? []) as TimerapportRad[];
    for (const rad of rader) {
      const { timmar, forvantad, ob_detaljer } = beraknaForvantadErsattning(rad, baseprice);
      totalForvantad += forvantad;

      // Check for missing OB
      for (const ob of ob_detaljer) {
        if (ob.ob > 0) {
          // Check if invoice has corresponding OB line
          const fakturaRader = (faktura.rader ?? []) as Array<Record<string, unknown>>;
          const hasOB = fakturaRader.some(
            (fr) => fr.typ === "ob_tillagg" && fr.a_pris === baseprice + ob.ob
          );
          if (!hasOB && ob.ob >= 82) {
            avvikelser.push({
              kod: "A3",
              datum: rad.datum,
              beskrivning: `OB-tillägg saknas kl ${ob.timme}:00 (${ob.ob === 222 ? "storhelgsnatt" : ob.ob === 184 ? "storhelgsdag" : ob.ob === 109 ? "helgnatt" : ob.ob === 96 ? "helgkväll/dag" : ob.ob === 82 ? "natt" : "kväll"} +${ob.ob} kr/tim)`,
              belopp: ob.ob,
            });
          }
        }
      }
    }

    // Compare totals
    const fakturerad = (faktura.summa_exkl_moms as number) ?? 0;
    const differens = totalForvantad - fakturerad;

    // Check rate mismatch (A4)
    const fakturaRader = (faktura.rader ?? []) as Array<Record<string, unknown>>;
    const grundprisRader = fakturaRader.filter((r) => r.typ === "grundpris");
    for (const gr of grundprisRader) {
      const aPris = gr.a_pris as number;
      if (aPris && Math.abs(aPris - baseprice) > 1) {
        avvikelser.push({
          kod: "A4",
          datum: "",
          beskrivning: `Fel timpris: fakturerat ${aPris} kr/tim, ${rateSource === "kontrakt" ? "kontrakt" : "nationellt avtal"} anger ${baseprice} kr/tim (${yrkeskategori}, zon ${zon})`,
          belopp: 0,
        });
      }
    }

    // Check hour mismatch (A1)
    const tidrapportTimmar = rader.reduce((sum, r) => {
      const s = parseTime(r.start_tid);
      let e = parseTime(r.slut_tid.replace("+1", ""));
      if (r.slut_tid.includes("+1") || e < s) e += 24;
      return sum + (e - s - (r.rast_minuter || 0) / 60);
    }, 0);
    const fakturaTimmar = grundprisRader.reduce((s, r) => s + ((r.antal_timmar as number) ?? 0), 0);
    if (Math.abs(tidrapportTimmar - fakturaTimmar) > 0.25) {
      avvikelser.push({
        kod: "A1",
        datum: "",
        beskrivning: `Tidrapport visar ${tidrapportTimmar.toFixed(1)}h, faktura visar ${fakturaTimmar.toFixed(1)}h (differens ${(tidrapportTimmar - fakturaTimmar).toFixed(1)}h)`,
        belopp: Math.round((tidrapportTimmar - fakturaTimmar) * baseprice),
      });
    }

    const harAvvikelse = avvikelser.length > 0 || Math.abs(differens) > 50;

    // 5. Save results
    await supabase.from("invoice_reviews").update({
      status: "completed",
      avvikelser,
      forvantad_summa: Math.round(totalForvantad),
      fakturerad_summa: Math.round(fakturerad),
      differens: Math.round(differens),
      har_avvikelse: harAvvikelse,
    }).eq("id", review_id);

    // 6. Notify if deviation found
    if (harAvvikelse) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (RESEND_API_KEY && LOVABLE_API_KEY) {
        const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
        try {
          await fetch(`${GATEWAY_URL}/emails`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": RESEND_API_KEY,
            },
            body: JSON.stringify({
              from: "CompCare <noreply@mail.compcare.se>",
              to: ["halvarholding@gmail.com"],
              subject: `Avvikelse hittad — ${(tidrapport.konsult_namn as string) ?? "Okänd"} (${(tidrapport.period as string) ?? ""})`,
              html: `
                <h2>Fakturaavvikelse upptäckt</h2>
                <p><strong>Konsult:</strong> ${(tidrapport.konsult_namn as string) ?? "Okänd"}</p>
                <p><strong>Period:</strong> ${(tidrapport.period as string) ?? ""}</p>
                <p><strong>Differens:</strong> ${Math.round(differens)} kr</p>
                <p><strong>Antal avvikelser:</strong> ${avvikelser.length}</p>
                <p><a href="https://compcare.se/admin">Se detaljer i admin</a></p>
              `,
            }),
          });
          await supabase.from("invoice_reviews").update({ notis_skickad: true }).eq("id", review_id);
        } catch (emailErr) {
          console.error("Email notification failed:", emailErr);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, har_avvikelse: harAvvikelse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("invoice-analyzer error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    // Try to update status to error
    try {
      const { review_id } = await req.clone().json();
      if (review_id) {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from("invoice_reviews").update({
          status: "error",
          error_message: message,
        }).eq("id", review_id);
      }
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
