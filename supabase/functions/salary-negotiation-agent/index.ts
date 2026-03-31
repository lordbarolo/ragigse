import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

/**
 * salary-negotiation-agent
 *
 * Thin orchestration layer:
 *   1. AI interprets user message → extracts intent + entities
 *   2. Calls CI capabilities (lookup_rate, salary_benchmark, salary_position, compare_roles)
 *   3. AI synthesises structured negotiation advice grounded in CI data
 *
 * Zero direct DB access — all data flows through compensation-intelligence.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Types ────────────────────────────────────────────────────────────────────

interface AgentRequest {
  message: string;
  context?: {
    role?: string;
    geography?: string;
    employment_type?: string;
    current_salary?: number;
    current_rate?: number;
    experience_years?: number;
  };
}

interface CICall {
  capability: string;
  params: Record<string, unknown>;
}

interface ExtractedIntent {
  capabilities: CICall[];
  user_situation: string;
  missing_info: string[];
}

interface AgentResponse {
  advice: string;
  situation_summary: string;
  data_points: Record<string, unknown>[];
  sources: { name: string; version: string; confidence: string }[];
  policy: { all_allowed: boolean; any_fallback: boolean };
  capabilities_used: string[];
  missing_info: string[];
}

// ── AI Gateway helpers ───────────────────────────────────────────────────────

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function sanitizeReijdarText(text: string): string {
  return text
    .replace(/SCB\s*\/\s*Medlingsinstitutet/gi, "marknadens snitt")
    .replace(/SCB(?:s)?\s+lönestatistik/gi, "marknadens snitt")
    .replace(/Medlingsinstitutet(?:s)?\s+lönestatistik/gi, "marknadens snitt")
    .replace(/\bSCB\b/gi, "marknadens snitt")
    .replace(/\bMedlingsinstitutet\b/gi, "marknadens snitt")
    .replace(/\blönebenchmark(?:en|et|er)?\b/gi, "marknadens snitt")
    .replace(/\bbenchmark(?:en|et|er)?\b/gi, "marknadens snitt");
}

async function callAI(
  systemPrompt: string,
  userPrompt: string,
  tools?: unknown[],
  toolChoice?: unknown
): Promise<unknown> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const body: Record<string, unknown> = {
    model: "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };
  if (tools) {
    body.tools = tools;
    body.tool_choice = toolChoice;
  }

  const res = await fetch(AI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("[AGENT] AI gateway error:", res.status, txt);
    throw new Error(`AI_GATEWAY_${res.status}`);
  }

  return await res.json();
}

// ── Step 1: Extract intent via tool calling ──────────────────────────────────

const INTENT_SYSTEM = `Du är Löneassistenten, en AI-assistent på CompCare specialiserad på löneförhandling. Analysera användarens meddelande och befintlig kontext.
Bestäm vilka CI-capabilities som behövs för att ge råd.

VIKTIGT — Du får BARA använda dessa capabilities:
- lookup_rate: Slå upp timpris för en yrkesroll i en zon. Kräver: role, geography. Valfritt: employment_type.
- salary_benchmark: Hämta marknadens snitt och nivåer (p25/p50/p75). Kräver: role. Valfritt: geography.
- salary_position: Som salary_benchmark men jämför mot användarens nuvarande lön. Kräver: role, current_salary.
- compare_roles: Jämför timpris mellan två roller. Kräver: role_a, role_b, geography.

Du ska ENBART svara på frågor inom dessa områden:
1. "Hur ligger min lön jämfört med marknadens snitt?"
2. "Hur skiljer sig min roll från liknande roller?"
3. "Vilket förhandlingsutrymme kan jag argumentera för?"
4. "Vad säger marknadens snitt och avtalsnivåer?"

Om användaren frågar om kommande uppdrag, tillgänglighet i regioner, eller prognoser för framtida behov: returnera en tom capabilities-array och skriv en missing_info-text som säger "Den typen av frågor besvaras bäst av Uppdragsassistenten som du hittar på uppdragssidan när du är inloggad."

Om användaren frågar om något annat utanför dessa områden (t.ex. arbetsrätt, anställningsvillkor, karriärråd), returnera en tom capabilities-array och skriv en tydlig missing_info-text om att frågan ligger utanför tjänstens fokus.

Returnera de capabilities som krävs baserat på vad användaren frågar. Om information saknas, lista det i missing_info.`;

const INTENT_TOOL = {
  type: "function",
  function: {
    name: "extract_intent",
    description: "Extrahera användarens avsikt och mappa till CI-capabilities",
    parameters: {
      type: "object",
      properties: {
        capabilities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              capability: {
                type: "string",
                enum: ["lookup_rate", "salary_benchmark", "salary_position", "compare_roles"],
              },
              params: {
                type: "object",
                description: "Parametrar för capability-anropet",
              },
            },
            required: ["capability", "params"],
          },
        },
        user_situation: {
          type: "string",
          description: "Kort sammanfattning av användarens situation",
        },
        missing_info: {
          type: "array",
          items: { type: "string" },
          description: "Information som saknas för ett fullständigt svar",
        },
      },
      required: ["capabilities", "user_situation", "missing_info"],
    },
  },
};

async function extractIntent(message: string, context?: AgentRequest["context"]): Promise<ExtractedIntent> {
  const contextStr = context
    ? `\n\nBefintlig kontext: ${JSON.stringify(context)}`
    : "";

  const result = await callAI(
    INTENT_SYSTEM,
    `${message}${contextStr}`,
    [INTENT_TOOL],
    { type: "function", function: { name: "extract_intent" } }
  ) as { choices: { message: { tool_calls?: { function: { arguments: string } }[] } }[] };

  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    return { capabilities: [], user_situation: message, missing_info: ["Kunde inte tolka frågan"] };
  }

  const parsed = JSON.parse(toolCall.function.arguments) as ExtractedIntent;
  console.log("[AGENT] Parsed capabilities:", JSON.stringify(parsed.capabilities));
  return parsed;
}

// ── Step 2: Call CI capabilities ─────────────────────────────────────────────

async function callCI(
  capability: string,
  params: Record<string, unknown>,
  clientIp: string
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  console.log(`[AGENT] Calling CI: ${capability}`, JSON.stringify(params));
  const ciUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/compensation-intelligence`;

  const res = await fetch(ciUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      "x-forwarded-for": clientIp,
    },
    body: JSON.stringify({
      capability,
      params,
      client_type: "agent",
    }),
  });

  const body = await res.json();
  const ok = res.ok && body.status === "success";
  if (!ok) console.log(`[AGENT] CI ${capability} failed:`, JSON.stringify(body.errors ?? body.error));
  return { ok, data: body };
}

// ── Step 3: Synthesise advice ────────────────────────────────────────────────

const ADVICE_SYSTEM = `Du är Löneassistenten, en expert på löneförhandling i Sverige, specialiserad på vården.
Du ger konkret, handlingsbart råd baserat på marknadsdata. Referera aldrig till dig själv vid namn.

PRIORITET 1 — KONKRET SVAR FÖRST
Ge alltid ett konkret och direkt tillämpbart svar först. Användaren ska aldrig behöva svara på en fråga för att få värde. Även med begränsad kontext ska svaret vara användbart.

PRIORITET 2 — FÖLJDFRÅGOR (SÄLLSYNT)
Avsluta ibland — inte alltid — med en enda följdfråga. Bara när användaren gett begränsad information och ett svar faktiskt skulle förändra eller fördjupa rådet. Aldrig mer än en fråga per svar. Aldrig en fråga i varje svar.
Exempel på följdfrågor att variera mellan:
- "Bor du på eller nära orten där uppdraget är?"
- "Har du jobbat på den här enheten tidigare?"
- "Hur många års erfarenhet har du inom din specialitet?"
- "Är det här ett av flera uppdrag du överväger just nu, eller är det detta som gäller?"
- "Har du arbetat som konsult tidigare, eller är det relativt nytt för dig?"

NÄR ANVÄNDAREN SVARAR PÅ EN FÖLJDFRÅGA
Väv in informationen som kontextuella argument och omständigheter — aldrig som uppmaningar. Exempel:
- "Eftersom du bor på orten faller kostnader för resa och boende bort för bemanningsföretaget — det är en omständighet värd att nämna i dialogen."
- "Med lång erfarenhet inom specialiteten finns det skäl att lyfta din kompetensprofil tidigt i kontakten."

SPRÅKREGLER
- Använd ALDRIG: "högre lön", "bättre ersättning", "förhandla upp" eller liknande.
- Använd istället: "omständigheter att lyfta", "argument i dialogen", "faktorer som påverkar bemanningsföretagets kalkyl", "något att nämna tidigt".

KOSTNADSRESERVATION (OBLIGATORISK)
- Varje gång du anger en konkret ersättningsnivå (kr/timme eller kr/månad) MÅSTE du avsluta med meningen: "Med reservation för tillkommande kostnader."
- Det finns kostnader kopplade till vissa uppdrag (resa, boende, försäkringar m.m.) som påverkar bemanningsföretagets marginal och som kan göra att det är rimligt med en ersättning som ligger under marknadens beräknade snittnivå. Ha alltid detta i åtanke.

STRIKTA REGLER:
- LÄNGD FÖRSTA SVARET: Högst fyra meningar plus reservationsmeningen. Inga förhandlingstips, inga punktlistor — bara den rena marknadslägesbilden. Exempel-struktur för första svaret:
  "Baserat på marknadens snitt i datan ligger din nuvarande timlön på [X] kr [under/inom/över] det rekommenderade intervallet för [ort]. Enligt SKR ramavtal bör den rekommenderade timlönen för en [roll] i detta område ligga mellan [min] kr och [max] kr. Detta motsvarar en månadslön på cirka [min_månad] kr till [max_månad] kr. Med reservation för tillkommande kostnader."
- LÄNGD FÖLJDSVAR: Max sex meningar. Kan inkludera en kort punktlista om relevant.
- Basera ALLA siffror på den data du får — hitta ALDRIG på siffror.
- Referera alltid till datakällan utan att nämna SCB eller Medlingsinstitutet. Skriv i stället "enligt SKR ramavtal" eller "utifrån marknadens snitt i datan".
- Var specifik med kronor/timme eller kronor/månad.
- Om data saknas, var tydlig med det — gissa aldrig.
- Svara BARA på frågor om marknadens snitt, rollsjämförelser, förhandlingsutrymme och avtalsnivåer.
- Om frågan handlar om kommande uppdrag eller prognoser, hänvisa till Uppdragsassistenten som finns på uppdragssidan för inloggade användare.
- Om frågan hamnar utanför detta, svara artigt att du bara kan hjälpa med löne- och ersättningsfrågor.
- Använd ALDRIG orden "benchmark", "SCB" eller "Medlingsinstitutet" i svaret.
- Aldrig utropstecken.
- Svara på svenska.
- Flödet ska kännas som en naturlig dialog — inte ett formulär och inte ett förhör.`;

const ADVICE_TOOL = {
  type: "function",
  function: {
    name: "negotiation_advice",
    description: "Strukturerat förhandlingsråd",
    parameters: {
      type: "object",
      properties: {
        advice: {
          type: "string",
          description: "Utförligt förhandlingsråd i markdown-format",
        },
        situation_summary: {
          type: "string",
          description: "Kort sammanfattning av användarens situation",
        },
      },
      required: ["advice", "situation_summary"],
    },
  },
};

async function synthesiseAdvice(
  message: string,
  situation: string,
  ciResults: { capability: string; ok: boolean; data: Record<string, unknown> }[]
): Promise<{ advice: string; situation_summary: string }> {
  const dataContext = ciResults
    .filter((r) => r.ok)
    .map((r) => `### ${r.capability}\n\`\`\`json\n${JSON.stringify(r.data.data, null, 2)}\n\`\`\`\nKälla: ${JSON.stringify(r.data.source)}`)
    .join("\n\n");

  const failedCaps = ciResults
    .filter((r) => !r.ok)
    .map((r) => `${r.capability}: ${JSON.stringify(r.data.errors ?? r.data.error)}`)
    .join("; ");

  const userPrompt = `Användarens fråga: "${message}"

Situation: ${situation}

Marknadsdata:
${dataContext || "Ingen data tillgänglig."}
${failedCaps ? `\nMisslyckade datahämtningar: ${failedCaps}` : ""}

Ge råd baserat på ovanstående data.`;

  const result = await callAI(
    ADVICE_SYSTEM,
    userPrompt,
    [ADVICE_TOOL],
    { type: "function", function: { name: "negotiation_advice" } }
  ) as { choices: { message: { tool_calls?: { function: { arguments: string } }[] } }[] };

  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    return { advice: "Kunde inte generera råd just nu.", situation_summary: situation };
  }

  return JSON.parse(toolCall.function.arguments);
}

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    // Rate limiting — 20 requests per IP per hour
    const sbAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const rl = await checkRateLimit(sbAdmin, "salary-negotiation-agent", clientIp, 20, 60);
    if (!rl.allowed) {
      return rateLimitResponse(rl, corsHeaders);
    }

    const { message, context } = (await req.json()) as AgentRequest;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "INVALID_INPUT", message: "Meddelande saknas." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (message.length > 2000) {
      return new Response(
        JSON.stringify({ error: "INVALID_INPUT", message: "Meddelandet är för långt (max 2000 tecken)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Extract intent
    const intent = await extractIntent(message, context);
    console.log("[AGENT] Intent extracted:", JSON.stringify({ caps: intent.capabilities.length, situation: intent.user_situation }));

    // Merge context into capability params where missing
    if (context) {
      for (const cap of intent.capabilities) {
        if (context.role && !cap.params.role && !cap.params.role_a) {
          cap.params.role = context.role;
        }
        if (context.geography && !cap.params.geography) {
          cap.params.geography = context.geography;
        }
        if (context.employment_type && !cap.params.employment_type) {
          cap.params.employment_type = context.employment_type;
        }
        if (context.current_salary && cap.capability === "salary_position" && !cap.params.current_salary) {
          cap.params.current_salary = context.current_salary;
        }
      }
    }

    // Fallback: if AI returned no capabilities but we have context, auto-generate calls
    if (intent.capabilities.length === 0 && context?.role) {
      console.log("[AGENT] No capabilities from AI — applying context-based fallback");
      // Always try lookup_rate if we have role + geography
      if (context.geography) {
        intent.capabilities.push({
          capability: "lookup_rate",
          params: {
            role: context.role,
            geography: context.geography,
            ...(context.employment_type ? { employment_type: context.employment_type } : {}),
          },
        });
      }
      // Try salary_position if we have current_salary
      if (context.current_salary) {
        intent.capabilities.push({
          capability: "salary_position",
          params: {
            role: context.role,
            current_salary: context.current_salary,
            ...(context.geography ? { geography: context.geography } : {}),
          },
        });
      }
      // Fallback to salary_benchmark if nothing else
      if (intent.capabilities.length === 0) {
        intent.capabilities.push({
          capability: "salary_benchmark",
          params: { role: context.role },
        });
      }
    }

    // Ensure lookup_rate is always included when we have role + geography
    // (it's the most reliable capability — backed by the full rates table)
    if (context?.role && context?.geography) {
      const hasLookup = intent.capabilities.some((c) => c.capability === "lookup_rate");
      if (!hasLookup) {
        intent.capabilities.unshift({
          capability: "lookup_rate",
          params: {
            role: context.role,
            geography: context.geography,
            ...(context.employment_type ? { employment_type: context.employment_type } : {}),
          },
        });
      }
    }

    // Step 2: Call CI capabilities in parallel
    const ciResults = await Promise.all(
      intent.capabilities.map(async (cap) => {
        const result = await callCI(cap.capability, cap.params, clientIp);
        return { capability: cap.capability, ...result };
      })
    );

    // Step 3: Synthesise advice
    const { advice, situation_summary } = await synthesiseAdvice(
      message,
      intent.user_situation,
      ciResults
    );

    // Collect sources and policy info
    const sources = ciResults
      .filter((r) => r.ok && r.data.source)
      .map((r) => r.data.source as { name: string; version: string; confidence: string });

    const uniqueSources = Array.from(
      new Map(sources.map((s) => [s.name, s])).values()
    );

    const response: AgentResponse = {
      advice: sanitizeReijdarText(advice),
      situation_summary: sanitizeReijdarText(situation_summary),
      data_points: ciResults.filter((r) => r.ok).map((r) => ({
        capability: r.capability,
        data: r.data.data,
      })),
      sources: uniqueSources.map((source) => ({
        ...source,
        name: sanitizeReijdarText(source.name),
      })),
      policy: {
        all_allowed: ciResults.every((r) => r.ok),
        any_fallback: ciResults.some((r) => r.ok && (r.data.policy as Record<string, unknown>)?.fallback_applied),
      },
      capabilities_used: ciResults.filter((r) => r.ok).map((r) => r.capability),
      missing_info: intent.missing_info.map((item) => sanitizeReijdarText(item)),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[AGENT] Error:", error);

    const isAiError = error instanceof Error && error.message.startsWith("AI_GATEWAY_");
    const status = isAiError
      ? (error.message === "AI_GATEWAY_429" ? 429 : error.message === "AI_GATEWAY_402" ? 402 : 500)
      : 500;

    const userMessage = status === 429
      ? "Tillfälligt hög belastning — försök igen om en stund."
      : status === 402
      ? "AI-tjänsten är tillfälligt otillgänglig."
      : "Internt fel — försök igen.";

    return new Response(
      JSON.stringify({ error: "AGENT_ERROR", message: userMessage }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
