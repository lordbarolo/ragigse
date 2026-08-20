// home-assistant — publika, fördefinierade frågor för startsidans assistent.
// Presetfrågor: deterministiska svar ur SKR-katalogen (contract_version_rates) och
// historiska avrop (calloff_imports) — ingen AI, cachade 24 h.
// Fritext: kräver inloggning, taket är 20/IP/dygn och 30 anrop/användare/dygn.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { getAiGatewayKey, getAiGatewayUrl, getAiModel } from "../_shared/ai-transport.ts";
import {
  aiRateLimitResponse,
  checkAiRateLimit,
  extractTokensFromResponse,
  logAiUsage,
} from "../_shared/ai-usage-logger.ts";
import {
  EMPLOYER_FACTOR,
  formatKr,
  formatPlain,
  resolveZone as resolveZoneShared,
  shareRange,
} from "../_shared/rate-guard.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GROUP_LABEL = /\bgrupp\s*[a-zA-Z0-9]+\b/i;

// ── Regel 2: presetfrågor kostar noll — deras DB-uppslag cachas 1 h per isolat ──
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h — färska presetsvar utan onödiga AI-anrop
const presetCache = new Map<string, { at: number; value: unknown }>();

async function memo<T>(cacheKey: string, fn: () => Promise<T>): Promise<T> {
  const hit = presetCache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T;
  const value = await fn();
  presetCache.set(cacheKey, { at: Date.now(), value });
  return value;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const kr = formatKr;
const krPlain = formatPlain;



// ── Långtidsminne ──────────────────────────────────────────────────────────
/** Så många nyckelpunkter som skickas med i systemprompten. */
const MEMORY_LIMIT = 25;
/** Så många punkter som får ligga kvar per användare — äldst gallras bort. */
const MEMORY_MAX_ROWS = 40;

const MEMORY_PROMPT =
  "Du underhåller ett långtidsminne för en AI-assistent som hjälper svenska vårdkonsulter. " +
  "Läs den senaste frågan och svaret och plocka ut de nyckelpunkter om ANVÄNDAREN som är " +
  "värda att minnas i framtida samtal: mål, preferenser, planer, familjesituation, " +
  "pendlingsvillkor, önskad ersättning, vilka regioner eller enheter de arbetat på, " +
  "vad de vill förhandla om.\n\n" +
  "REGLER:\n" +
  "- Bara fakta om användaren. Aldrig assistentens egna resonemang, priser ur ramavtalet, " +
  "marginaler, procentsatser eller beräkningsmodeller.\n" +
  "- En kort mening per punkt, max 140 tecken, på svenska, i tredje person ('Vill ...', 'Arbetar ...').\n" +
  "- Hitta aldrig på. Är inget nytt värt att minnas: returnera en tom lista.\n" +
  "- Upprepa inte något som redan finns i minnet.\n\n" +
  'Svara med ENBART giltig JSON: {"points": ["..."]} — max 3 punkter.';

/**
 * Destillerar nya nyckelpunkter ur senaste turen och sparar dem.
 * Returnerar antalet nya punkter. Kastar aldrig vidare på gateway-fel.
 */
async function distillMemory(opts: {
  // deno-lint-ignore no-explicit-any
  supabase: any;
  key: string;
  userId: string;
  question: string;
  answer: string;
  existing: string[];
}): Promise<number> {
  const model = getAiModel();
  const startedAt = Date.now();
  const res = await fetch(getAiGatewayUrl(), {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: MEMORY_PROMPT },
        {
          role: "user",
          content:
            (opts.existing.length
              ? `Redan i minnet:\n${opts.existing.map((p) => `- ${p}`).join("\n")}\n\n`
              : "") +
            `Användarens fråga:\n${opts.question}\n\nAssistentens svar:\n${opts.answer}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error("[home-assistant] minnesdestillering misslyckades", res.status);
    return 0;
  }

  const payload = await res.json();
  const { inputTokens, outputTokens } = extractTokensFromResponse(payload);
  await logAiUsage({
    feature: "home-assistant-memory",
    model,
    userId: opts.userId,
    inputTokens,
    outputTokens,
    durationMs: Date.now() - startedAt,
    status: "success",
  });

  const raw = payload?.choices?.[0]?.message?.content ?? "";
  let points: string[] = [];
  try {
    const parsed = JSON.parse(String(raw).replace(/^```(?:json)?\s*|\s*```$/g, ""));
    points = Array.isArray(parsed?.points) ? parsed.points : [];
  } catch {
    console.error("[home-assistant] ogiltig JSON från minnesmodellen");
    return 0;
  }

  const seen = new Set(opts.existing.map((p) => p.trim().toLowerCase()));
  const fresh: string[] = [];
  for (const p of points) {
    const text = typeof p === "string" ? p.trim().slice(0, 200) : "";
    const norm = text.toLowerCase();
    if (text.length < 8 || seen.has(norm)) continue;
    seen.add(norm);
    fresh.push(text);
    if (fresh.length >= 3) break;
  }
  if (fresh.length === 0) return 0;

  const { error } = await opts.supabase.from("assistant_memory").insert(
    fresh.map((content) => ({
      user_id: opts.userId,
      content,
      source_question: opts.question.slice(0, 300),
      origin: "assistant",
    })),
  );
  if (error) {
    // Unik-index på (user_id, lower(content)) → dubbletter är ett väntat, ofarligt fel.
    if (error.code !== "23505") console.error("[home-assistant] kunde inte spara minne", error.message);
    return 0;
  }

  // Gallra så att minnet inte växer obegränsat.
  const { data: overflow } = await opts.supabase
    .from("assistant_memory")
    .select("id")
    .eq("user_id", opts.userId)
    .order("updated_at", { ascending: false })
    .range(MEMORY_MAX_ROWS, MEMORY_MAX_ROWS + 50);
  const staleIds = (overflow ?? []).map((r: { id: string }) => r.id);
  if (staleIds.length) {
    await opts.supabase.from("assistant_memory").delete().in("id", staleIds);
  }

  return fresh.length;
}




Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await checkRateLimit(supabase, "home-assistant", clientIp, 60, 60);
  if (!rl.allowed) {
    return json({ error: "För många frågor just nu. Försök igen om en stund." }, 429);
  }

  let body: {
    action?: string;
    key?: string;
    role?: string;
    zone?: string;
    question?: string;
    context?: {
      role?: string | null;
      kommun?: string | null;
      employment_type?: string | null;
      current_hourly_rate?: number | null;
    } | null;
  } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Ogiltig förfrågan" }, 400);
  }

  try {
    // ── Rollista ur katalogen (aktiva ramavtalsversioner) ──
    if (body.action === "roles") {
      const { data, error } = await supabase
        .from("contract_version_rates")
        .select("yrkeskategori, contract_versions!inner(is_active)")
        .eq("typ", "Grundpris")
        .eq("contract_versions.is_active", true);
      if (error) throw error;

      const roles = Array.from(
        new Set((data ?? []).map((r: { yrkeskategori: string }) => r.yrkeskategori)),
      )
        .filter((r) => r && !GROUP_LABEL.test(r))
        .sort((a, b) => a.localeCompare(b, "sv"));

      return json({ roles });
    }

    // ── Fritext: kräver inloggad session; profilen agerar kontext (RAG) ──
    if (body.action === "freetext") {
      const authHeader = req.headers.get("Authorization") ?? "";
      const token = authHeader.replace(/^Bearer\s+/i, "");
      const { data: userData } = token
        ? await supabase.auth.getUser(token)
        : { data: { user: null } };
      if (!userData?.user) {
        return json({ error: "Fritextfrågor kräver inloggning." }, 401);
      }
      const userId = userData.user.id;

      // ── Regel 1: hårt tak per IP/dygn (stoppar bottar innan de kostar något) ──
      const ipDay = await checkRateLimit(supabase, "home-assistant-freetext", clientIp, 20, 1440);
      if (!ipDay.allowed) {
        return json(
          { error: "Dagens gräns för fritextfrågor från den här uppkopplingen är nådd." },
          429,
        );
      }

      // ── Regel 3: kvot per inloggad användare (30/dygn, admins undantagna) ──
      const quota = await checkAiRateLimit(userId, 30);
      if (!quota.allowed) return aiRateLimitResponse(quota, corsHeaders);

      const question = (body.question ?? "").trim().slice(0, 500);
      if (!question) return json({ error: "Tom fråga" }, 400);

      // ── Långtidsminne: nyckelpunkter användaren (eller assistenten) sparat ──
      const { data: memoryRows } = await supabase
        .from("assistant_memory")
        .select("content")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(MEMORY_LIMIT);
      const memoryPoints = (memoryRows ?? [])
        .map((r: { content: string }) => r.content)
        .filter(Boolean);
      const memoryContext = memoryPoints.length
        ? "Detta minns du från tidigare samtal med användaren (behandla som bakgrund, " +
          "upprepa det inte i onödan och lita på det bara om det är förenligt med profilen): " +
          memoryPoints.map((p) => `- ${p}`).join(" ")
        : "";

      const ctx = body.context ?? null;

      // ── Rollistan ur katalogen: används både för uppslag och för att tolka
      //    roll/ort som användaren uppger i själva frågan. ──
      const { data: catalogRows } = await supabase
        .from("contract_version_rates")
        .select("yrkeskategori, zon, timpris_kund, contract_versions!inner(is_active, version_label)")
        .eq("typ", "Grundpris")
        .eq("contract_versions.is_active", true);
      const catalog = ((catalogRows ?? []) as unknown as {
        yrkeskategori: string;
        zon: string;
        timpris_kund: number;
        contract_versions: { version_label: string };
      }[]).filter((r) => r.yrkeskategori && !GROUP_LABEL.test(r.yrkeskategori));

      const q = question.toLowerCase();

      /** Roll ur frågan: exakt kataloginamn först, därefter ett fåtal vardagsnamn. */
      function roleFromQuestion(): string | null {
        const names = Array.from(new Set(catalog.map((r) => r.yrkeskategori)))
          .sort((a, b) => b.length - a.length);
        const direct = names.find((n) => q.includes(n.toLowerCase()));
        if (direct) return direct;
        const aliases: [RegExp, RegExp][] = [
          [/\bspecialistläkare\b/, /^specialistläkare$/i],
          [/\b(leg\.?\s*läkare|läkare)\b/, /^legitimerad läkare$/i],
          [/\b(sjuksköterska|ssk)\b/, /^legitimerad sjuksköterska$/i],
        ];
        for (const [needle, target] of aliases) {
          if (needle.test(q)) {
            const hit = names.find((n) => target.test(n));
            if (hit) return hit;
          }
        }
        return null;
      }

      /** Kommun → zon via den delade uppslagningen (locations → regions). */
      const resolveZone = (kommun: string) => resolveZoneShared(supabase, kommun);


      /** Ort ur frågan: matchas mot faktiska kommuner, aldrig fritt gissad. */
      async function kommunFromQuestion(): Promise<string | null> {
        const { data: locRows } = await supabase.from("locations").select("kommun");
        const names = ((locRows ?? []) as { kommun: string }[])
          .map((r) => r.kommun)
          .filter((k) => k && k.length >= 4)
          .sort((a, b) => b.length - a.length);
        return names.find((k) => q.includes(k.toLowerCase())) ?? null;
      }

      // Uppgifter från frågan kompletterar profilen när profilen saknar dem.
      const effRole = (ctx?.role && !GROUP_LABEL.test(ctx.role) ? ctx.role : null) ??
        roleFromQuestion();
      const effKommun = ctx?.kommun ?? (await kommunFromQuestion());

      // ── Zonen härleds ur kommunen. Utan träff får modellen inga belopp alls,
      //    så den kan inte gissa fel zon (t.ex. Gällivare som "Zon 1"). ──
      const userZone = effKommun ? await resolveZone(effKommun) : null;

      let rateContext = "";
      // Råa kundpriser samlas för utgångsspärren nedan — de får aldrig nå svaret.
      const forbiddenAmounts: number[] = [];
      if (effRole) {
        const allRows = catalog.filter(
          (r) => r.yrkeskategori.toLowerCase() === effRole.toLowerCase(),
        );
        for (const r of allRows) forbiddenAmounts.push(Math.round(Number(r.timpris_kund)));
        const rows = userZone ? allRows.filter((r) => r.zon === userZone) : [];
        if (rows.length) {
          const [shareLo, shareHi] = shareRange(effRole);
          const employed = ctx?.employment_type === "anstalld";
          const factor = employed ? EMPLOYER_FACTOR : 1;
          // Enda tillåtna siffror i svaret: möjlig ersättning per zon, redan
          // nedräknad från regionens pris med bemanningsföretagets marginal.
          rateContext =
            `Möjlig ersättning för ${effRole} (${rows[0].contract_versions.version_label}), ` +
            `${employed ? "som anställd konsult" : "som egenföretagare"} i ${effKommun}: ` +
            rows
              .map((r) => {
                const p = Number(r.timpris_kund);
                return `${krPlain((p * shareLo) / factor)}–${kr((p * shareHi) / factor)}`;
              })
              .join(", ") +
            ". Dessa belopp är redan färdigräknade — använd dem exakt som de står, " +
            "och nämn inga andra belopp.";
        }
      }

      // ── Fallback: saknas roll, ort eller zon-mappning lämnas inga belopp alls.
      //    Assistenten ska då fråga efter exakt det som saknas. ──
      const missing: string[] = [];
      if (!effRole) missing.push("vilken roll (yrkestitel) frågan gäller");
      if (!effKommun) missing.push("vilken kommun eller ort uppdraget gäller");
      else if (!userZone) missing.push(`vilken närliggande kommun som gäller (vi saknar uppgift för ${effKommun})`);
      if (effRole && effKommun && userZone && !rateContext) {
        missing.push("vilken roll som ligger närmast, eftersom vi saknar pris för den angivna rollen");
      }
      const fallbackContext = rateContext
        ? ""
        : "VIKTIGT: vi har inga färdigräknade ersättningsbelopp för den här frågan. " +
          "Nämn därför INGA belopp och gör inga beräkningar. Svara kort och be användaren " +
          `om följande uppgifter: ${missing.join("; ")}. ` +
          "Förklara att du kan visa möjlig ersättning så snart uppgifterna finns.";

      const profileContext = ctx
        ? `Användarens profil: roll ${ctx.role ?? "okänd"}, ort ${ctx.kommun ?? "okänd"}, ` +
          `kontraktsform ${ctx.employment_type ?? "okänd"}, nuvarande ersättning ` +
          `${ctx.current_hourly_rate ?? "okänd"} kr/h.` +
          (effRole && effRole !== ctx.role ? ` Roll enligt frågan: ${effRole}.` : "") +
          (effKommun && effKommun !== ctx.kommun ? ` Ort enligt frågan: ${effKommun}.` : "")
        : "Användaren har ingen sparad profil." +
          (effRole ? ` Roll enligt frågan: ${effRole}.` : "") +
          (effKommun ? ` Ort enligt frågan: ${effKommun}.` : "");


      const key = getAiGatewayKey();
      if (!key) return json({ error: "Assistenten är inte tillgänglig just nu." }, 503);

      const systemPrompt =
        "Du är vårdbemanning.ai:s assistent för svenska vårdkonsulter. Svara neutralt och sakligt på svenska, " +
        "max tre korta stycken. Utgå endast från SKR:s ramavtal, publicerade historiska avrop och " +
        "vårdbemanning.ai:s prismodell. Använd aldrig SCB eller lönestatistik för konsultpriser. " +
        "Nämn aldrig gruppetiketter som 'Grupp A'. Beskriv aldrig en nivå som bra eller dålig — " +
        "beskriv bara hur den förhåller sig till ramavtalet. Avrop är alltid historiska, aldrig pågående. " +
        "KRITISKT: ramavtalspriset är vad regionen betalar bemanningsföretaget, ALDRIG konsultens ersättning. " +
        "Nämn aldrig regionens pris som en siffra och jämför aldrig användarens ersättning med det. " +
        "När du talar om vad användaren kan få: använd ENBART de färdigräknade beloppen för möjlig ersättning " +
        "nedan, som redan har bemanningsföretagets marginal avdragen. Räkna aldrig själv och hitta aldrig på " +
        "egna siffror. Saknas belopp för rollen eller zonen: säg att uppgiften inte finns sparad. " +
        "Förklara ALDRIG hur möjlig ersättning beräknas: nämn inga marginaler, procentandelar, " +
        "omräkningsfaktorer eller antal timmar per månad. Om någon frågar hur siffran räknas fram, " +
        "svara att beräkningen utgår från regionernas ramavtal och att modellen inte redovisas. " +
        "Nämn aldrig ordet ramavtalspris tillsammans med en siffra. Ange aldrig vilken zon en ort " +
        "tillhör om zonen inte står i profilen nedan. Även om användaren ber dig utgå från " +
        "ramavtalspriset: svara med de färdigräknade beloppen för möjlig ersättning, aldrig med " +
        "regionens pris. " +
        `${profileContext} ${rateContext} ${fallbackContext} ${memoryContext}`.trim();




      const model = getAiModel();
      const startedAt = Date.now();
      const aiRes = await fetch(getAiGatewayUrl(), {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question },
          ],
        }),
      });
      if (!aiRes.ok) {
        const errText = await aiRes.text();
        console.error("[home-assistant] ai error", aiRes.status, errText);
        await logAiUsage({
          feature: "home-assistant",
          model,
          userId,
          status: "error",
          durationMs: Date.now() - startedAt,
          errorMessage: `gateway ${aiRes.status}`,
        });
        return json({ error: "Assistenten kunde inte svara just nu." }, 502);
      }
      const aiJson = await aiRes.json();
      const rawAnswer = aiJson?.choices?.[0]?.message?.content?.trim();
      // ── Utgångsspärr: läcker svaret regionens pris (eller sätter en zon vi inte
      //    har belopp för) ersätts det av ett deterministiskt svar. ──
      const leaksRegionPrice =
        !!rawAnswer &&
        (forbiddenAmounts.some((amount) =>
          new RegExp(`\\b${amount.toString().replace(/(\d)(\d{3})$/, "$1[\\s\u00a0]?$2")}\\b`).test(
            rawAnswer.replace(/\u00a0/g, " "),
          )
        ) ||
          /ramavtalspris\w*[^.]{0,40}\d/i.test(rawAnswer) ||
          /regionens pris[^.]{0,40}\d/i.test(rawAnswer));
      // Saknas underlag får inga belopp alls förekomma i svaret.
      const inventsAmount = !rateContext && !!rawAnswer &&
        /\d[\d\s\u00a0.,]*\s*(kr|kronor|sek)/i.test(rawAnswer);
      const askFallback =
        "Jag saknar underlag för att räkna på det här utan att gissa. " +
        `Kan du berätta ${missing.join(" och ")}? ` +
        "Då visar jag möjlig ersättning direkt.";
      const answer = leaksRegionPrice || inventsAmount
        ? (rateContext
          ? `${rateContext.replace(
            /\. Dessa belopp[\s\S]*$/,
            ".",
          )}\n\nBeräkningen utgår från regionernas ramavtal. Modellen bakom beloppen redovisas inte.`
          : askFallback)
        : rawAnswer;


      const { inputTokens, outputTokens } = extractTokensFromResponse(aiJson);
      await logAiUsage({
        feature: "home-assistant",
        model,
        userId,
        inputTokens,
        outputTokens,
        durationMs: Date.now() - startedAt,
        status: answer ? "success" : "error",
        errorMessage: answer ? undefined : "empty_answer",
      });
      if (!answer) return json({ error: "Assistenten kunde inte svara just nu." }, 502);

      // ── Minnet uppdateras efter svaret. Ett fel här får aldrig fälla svaret. ──
      let memoryAdded = 0;
      try {
        memoryAdded = await distillMemory({
          supabase,
          key,
          userId,
          question,
          answer,
          existing: memoryPoints,
        });
      } catch (err) {
        console.error("[home-assistant] minnet kunde inte uppdateras", err);
      }

      // Mjuk varning vid 80 % av dygnskvoten
      const used = (quota.used ?? 0) + 1;
      const limit = quota.limit ?? null;
      const warn = limit && !quota.is_admin && used >= Math.floor(limit * 0.8)
        ? `Du har använt ${used} av ${limit} fritextfrågor i dag.`
        : undefined;


      return json({
        answer,
        source: "SKR:s ramavtal, publicerade avrop och din sparade profil",
        quota: { used, limit, warning: warn },
        memory_added: memoryAdded,
      });


    }

    if (body.action !== "answer") return json({ error: "Okänd åtgärd" }, 400);

    const key = body.key ?? "";

    // ── Statiska kunskapssvar ──
    if (key === "ramavtal") {
      return json({
        answer:
          "SKR:s ramavtal sätter det pris regionen betalar per timme för en given roll och zon (grundpris). " +
          "I grundpriset ingår ordinarie arbetstid. Utanför grundpriset ligger OB, jour och beredskap, som ersätts " +
          "separat enligt avtalets påslag, samt resor och boende som regleras per avrop.\n\n" +
          "Ramavtalet reglerar inte din ersättning — det reglerar vad regionen betalar bemanningsföretaget. " +
          "Din möjliga ersättning visas som ett spann per roll och zon.",
        source: "SKR:s ramavtal för hyrpersonal, offentliga prisbilagor",
      });
    }

    if (key === "anstallningsform") {
      return json({
        answer:
          "Som egenföretagare fakturerar du ett belopp som utgår från kundpriset enligt ramavtalet.\n\n" +
          "Som anställd konsult visas motsvarande nivå som lön. Samma kundpris ger därför olika belopp " +
          "beroende på anställningsform.",
        source: "SKR-ramavtal",
      });
    }

    if (key === "ob") {
      return json({
        answer:
          "OB, jour och beredskap ersätts separat utanför ramavtalets grundpris. Påslagen är procentuella " +
          "och varierar beroende på vardag, helg, natt och storhelg. Exakta nivåer framgår av den aktuella " +
          "prisbilagan till avtalet.\n\n" +
          "Grundpriset avser ordinarie arbetstid.",
        source: "SKR:s ramavtal för hyrpersonal",
      });
    }

    if (key === "vite") {
      return json({
        answer:
          "Vite är ett avtalsvite som kan utdömas om bemanningsföretaget inte uppfyller sina åtaganden " +
          "enligt ramavtalet, exempelvis brister i dokumentation eller kvalificerad personal. Vite följer " +
          "avtalets särskilda villkor och påverkar i första hand relationen mellan region och bemanningsföretag, " +
          "inte konsultens ersättning direkt.",
        source: "SKR:s ramavtal för hyrpersonal",
      });
    }

    if (key === "krav_bemanning") {
      return json({
        answer:
          "Ramavtalet ställer krav på att bemanning sker via auktoriserade bemanningsföretag och att personalen " +
          "har giltig legitimation, HOSP- eller IVO-registrering och erforderlig kompetens för rollen. " +
          "Regionen specificerar ytterligare krav i varje avrop, till exempel erfarenhet eller specialistbevis.",
        source: "Regionernas avropsunderlag, SKR:s ramavtal",
      });
    }

    if (key === "uppsagning") {
      return json({
        answer:
          "Uppsägningstid och villkor för avbrott regleras i det enskilda avtalet mellan region och bemanningsföretag, " +
          "samt i ditt anställnings- eller konsultavtal.\n\n" +
          "Ramavtalet styr i första hand regionernas upphandling och prissättning, inte enskilda anställningsvillkor.",
        source: "SKR:s ramavtal för hyrpersonal",
      });
    }

    if (key === "uppgifter") {
      return json({
        answer:
          "Roll, ort, kontraktsform och ersättning behövs för att visa information om dina villkor i förhållande till " +
          "den övriga marknaden. Inga uppgifter delas.\n\n" +
          "Data lagras inom EU och används endast för din egen analys.",
        source: "vårdbemanning.ai:s integritetspolicy",
      });
    }

    // ── Statiska kunskapssvar för de fasta frågorna ──
    if (key === "erfarenhet") {
      return json({
        answer:
          "Kravet sätts i avropet, inte i ramavtalet. I regionernas avropsunderlag är två års yrkeserfarenhet inom " +
          "aktuellt område ett vanligt minimikrav för sjuksköterskor, och specialistbevis plus erfarenhet av " +
          "motsvarande verksamhet för läkare.\n\n" +
          "Erfarenhet påverkar inte kundpriset — priset styrs av roll och zon i ramavtalet.",
        source: "Regionernas avropsunderlag, SKR:s ramavtal",
      });
    }

    if (key === "termin10") {
      return json({
        answer:
          "Ramavtalet prissätter legitimerad personal. Underläkare före legitimation avropas i egna kategorier och " +
          "förutsätter att du uppfyller Socialstyrelsens krav för att arbeta som underläkare, samt att vårdgivaren " +
          "godkänner det i avropet.\n\n" +
          "Det avgörs alltså av det enskilda avropet och din lärosätesregistrering — inte av ramavtalspriset.",
        source: "SKR:s ramavtal, Socialstyrelsens regelverk",
      });
    }

    if (key === "patientforsakring") {
      return json({
        answer:
          "Vid uppdrag inom region eller kommun omfattas patienten av vårdgivarens patientförsäkring enligt " +
          "patientskadelagen — den följer verksamheten, inte konsulten.\n\n" +
          "Som eget bolag reglerar avtalet med bemanningsbolaget eller vårdgivaren vilka försäkringar du själv ska " +
          "hålla, vanligen ansvars- och företagsförsäkring. Kontrollera skrivningen i ditt avtal innan uppdraget.",
        source: "Patientskadelagen, avtalspraxis i avropen",
      });
    }

    // ── Avrop: sjuksköterskor i Gävleborg (historiskt underlag, cachat 24 h) ──
    if (key === "avrop_gavle") {
      const count = await memo("avrop_gavle", async () => {
        const { count } = await supabase
          .from("calloff_imports")
          .select("id", { count: "exact", head: true })
          .ilike("region", "%Gävleborg%")
          .ilike("role", "%sjuksköterska%");
        return count ?? 0;
      });

      return json({
        answer:
          `I det historiska underlaget finns ${count ?? 0} publicerade avrop av sjuksköterskor i Gävleborg.\n\n` +
          "Underlaget är historiskt och avser publicerade avrop. vårdbemanning.ai visar inte pågående eller framtida uppdrag.",
        source: "Publicerade avrop, historiskt underlag",
      });
    }

    // ── Avrop senaste 30 dagarna (historiska, publicerade, cachat 24 h) ──
    if (key === "avrop") {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const { count, rows } = await memo(`avrop:${since}`, async () => {
        const { count } = await supabase
          .from("calloff_imports")
          .select("id", { count: "exact", head: true })
          .gte("calloff_date", since);

        const { data } = await supabase
          .from("calloff_imports")
          .select("role, region")
          .gte("calloff_date", since)
          .limit(1000);
        return { count: count ?? 0, rows: data ?? [] };
      });


      const byRole = new Map<string, number>();
      for (const r of (rows ?? []) as { role: string | null }[]) {
        if (!r.role || GROUP_LABEL.test(r.role)) continue;
        byRole.set(r.role, (byRole.get(r.role) ?? 0) + 1);
      }
      const top = [...byRole.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

      return json({
        answer:
          `Senaste 30 dagarna finns ${count ?? 0} publicerade avrop i underlaget.` +
          (top.length
            ? `\n\nVanligast förekommande roller:\n${top.map(([r, n]) => `• ${r} — ${n} st`).join("\n")}`
            : "") +
          "\n\nUnderlaget är historiskt. vårdbemanning.ai visar inte pågående eller framtida uppdrag.",
        source: "Publicerade avrop, historiskt underlag",
      });
    }

    // ── Fasta prisfrågor med förutbestämd roll/ort ──
    const FIXED: Record<string, { role: string; zone: string; place: string; mode: "pris" | "fakturera" | "jamfor"; amount?: number }> = {
      ssk_stockholm: { role: "Sjuksköterska", zone: "Zon 1", place: "Stockholm", mode: "pris" },
      allmanlakare_torsby: { role: "Specialistläkare Allmänmedicin", zone: "Zon 3", place: "Torsby", mode: "fakturera" },
      lon_malmo: { role: "Sjuksköterska", zone: "Zon 1", place: "Malmö", mode: "jamfor", amount: 390 },
    };

    const fixed = FIXED[key];
    const isCatalogKey = key === "pris" || key === "fakturera" || key === "zoner";

    // ── Prisfrågor: kräver roll (+ zon för pris/fakturering) ──
    if (fixed || isCatalogKey) {
      const role = fixed?.role ?? body.role;
      if (!role) return json({ need: "role" });
      if (GROUP_LABEL.test(role)) return json({ error: "Ogiltig roll" }, 400);
      if (!fixed && key !== "zoner" && !body.zone) return json({ need: "zone", role });

      const rows = await memo(`rates:${role.toLowerCase()}`, async () => {
        const { data, error } = await supabase
          .from("contract_version_rates")
          .select("zon, timpris_kund, contract_versions!inner(is_active, version_label)")
          .eq("typ", "Grundpris")
          .eq("contract_versions.is_active", true)
          .ilike("yrkeskategori", role);
        if (error) throw error;
        return (data ?? []) as unknown as {
          zon: string;
          timpris_kund: number;
          contract_versions: { version_label: string };
        }[];
      });
      if (!rows.length) return json({ answer: `Jag hittar inget aktivt ramavtalspris för ${role}.` });


      const byZone: Record<string, number> = {};
      let version = "";
      for (const r of rows) {
        byZone[r.zon] = Number(r.timpris_kund);
        version = r.contract_versions.version_label;
      }
      const [lo, hi] = shareRange(role);

      if (key === "zoner") {
        const lines = ["Zon 1", "Zon 2", "Zon 3"]
          .filter((z) => byZone[z] != null)
          .map((z) => `• ${z}: ${kr(byZone[z])}`)
          .join("\n");
        return json({
          answer: `Kundpris per zon för ${role} (ramavtal ${version}):\n${lines}\n\nZonen bestäms av var uppdraget utförs — zon 3 är mest avlägsen och har högst pris.`,
          source: `SKR-ramavtal ${version}`,
        });
      }

      const zone = fixed?.zone ?? body.zone!;
      const price = byZone[zone];
      if (price == null) return json({ answer: `Jag hittar inget pris för ${role} i ${zone}.` });
      const where = fixed ? `${fixed.place} (${zone})` : zone;

      if (fixed?.mode === "jamfor") {
        const salaryLo = (price * lo) / EMPLOYER_FACTOR;
        const salaryHi = (price * hi) / EMPLOYER_FACTOR;
        return json({
          answer:
            `Kundpriset för ${role} i ${where} är ${kr(price)} enligt ramavtal ${version}.\n\n` +
            `Möjlig ersättning som anställd är ungefär ${kr(salaryLo)}–${kr(salaryHi)}.\n\n` +
            `${fixed.amount} kr/timme ligger ${fixed.amount! < salaryLo ? "under" : fixed.amount! > salaryHi ? "över" : "inom"} det spannet. ` +
            `Vi anger inte om en nivå är bra — bara hur den förhåller sig till ramavtalet.`,
          source: `SKR-ramavtal ${version}`,
        });
      }

      if (key === "pris" || fixed?.mode === "pris") {
        return json({
          answer:
            `Regionen betalar ${kr(price)} för ${role} i ${where} enligt ramavtal ${version}.\n\n` +
            `Det är kundpriset. Din möjliga ersättning visas som ett spann.`,
          source: `SKR-ramavtal ${version}`,
        });
      }

      return json({
        answer:
          `${role} i ${where}: kundpris ${kr(price)} enligt ramavtal ${version}.\n\n` +
          `Möjlig ersättning som egenföretagare: ${kr(price * lo)}–${kr(price * hi)}.\n\n` +
          `Som anställd motsvarar det ungefär ${kr((price * lo) / EMPLOYER_FACTOR)}–${kr((price * hi) / EMPLOYER_FACTOR)} i lön.`,
        source: `SKR-ramavtal ${version}`,
      });
    }

    return json({ error: "Okänd fråga" }, 400);

  } catch (e) {
    console.error("[home-assistant]", e);
    return json({ error: "Något gick fel. Försök igen." }, 500);
  }
});
