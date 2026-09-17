/**
 * AI-anrop för beta-avtalsgranskaren. Systemprompter ligger enbart här (server).
 */

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
export const BETA_MODEL = "google/gemini-3-flash-preview";

export class BetaAiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export interface ExtractedContract {
  profession: "Läkare" | "Sjuksköterska";
  specialty: string | null;
  region: string | null;
  compensation_type: "AB" | "Faktura" | "Anställd" | "Okänt";
  offered_rate: number | null;
  housing_included: boolean;
  travel_included: boolean;
  ob_specified: boolean;
  flagged_issues: Array<{
    title: string;
    detail: string;
    severity: "low" | "medium" | "high";
  }>;
  masked_summary: string;
  confidence: number;
}

const EXTRACT_SYSTEM_PROMPT =
  "Du är en svensk avtalsanalytiker specialiserad på vårdsektorn och SKR:s ramavtal. " +
  "Läs uppdragsbekräftelser, offerter eller mejl och extrahera nyckeldata. " +
  "Identifiera yrke, specialitet, region och timersättning exkl. moms. " +
  "Maskera alla personnamn, personnummer, telefonnummer och e-post. " +
  "Lista 1–3 konkreta risker. Hitta inte på värden – returnera null om uppgift saknas.";

const EXTRACT_TOOL = {
  type: "function",
  function: {
    name: "leverera_analys",
    description: "Returnerar extraherade nyckeldata från avtalsunderlaget.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        profession: { type: "string", enum: ["Läkare", "Sjuksköterska"] },
        specialty: {
          type: ["string", "null"],
          description:
            "Normaliserad SKR-term, t.ex. 'Specialistläkare Allmänmedicin', " +
            "'Legitimerad läkare', 'Sjuksköterska', 'Barnmorska', 'Distriktssjuksköterska'.",
        },
        region: { type: ["string", "null"], description: "Region eller kommun/ort som nämns." },
        compensation_type: { type: "string", enum: ["AB", "Faktura", "Anställd", "Okänt"] },
        offered_rate: {
          type: ["number", "null"],
          description:
            "Kronor per timme exkl. moms. Om månadslön anges: räkna om med 165 h/mån " +
            "och sätt compensation_type 'Anställd'.",
        },
        housing_included: { type: "boolean" },
        travel_included: { type: "boolean" },
        ob_specified: { type: "boolean" },
        flagged_issues: {
          type: "array",
          minItems: 1,
          maxItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              detail: { type: "string" },
              severity: { type: "string", enum: ["low", "medium", "high"] },
            },
            required: ["title", "detail", "severity"],
          },
        },
        masked_summary: {
          type: "string",
          description:
            "2–3 meningar om erbjudandet där alla personnamn, personnummer, telefonnummer, " +
            "e-postadresser och gatuadresser ersatts med [MASKERAT].",
        },
        confidence: { type: "number", minimum: 0, maximum: 1 },
      },
      required: [
        "profession",
        "specialty",
        "region",
        "compensation_type",
        "offered_rate",
        "housing_included",
        "travel_included",
        "ob_specified",
        "flagged_issues",
        "masked_summary",
        "confidence",
      ],
    },
  },
} as const;

const COUNTER_TOOL = {
  type: "function",
  function: {
    name: "leverera_motbud",
    description: "Returnerar två mejlutkast: ett mjukt och ett tydligare.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        soft: { type: "string", description: "Mjukare ton, max ca 180 ord." },
        sharp: {
          type: "string",
          description: "Tydligare krav och kortare svarstid, fortfarande hövligt. Max ca 180 ord.",
        },
      },
      required: ["soft", "sharp"],
    },
  },
} as const;

const COUNTER_SYSTEM_PROMPT =
  "Du skriver sakliga svenska mejlutkast för vårdkonsulter som svarar på ett uppdragserbjudande. " +
  "Tonen är neutral, professionell och diskret – som en bank. Inga hotfulla eller värdeladdade ord, " +
  "inga superlativ, ingen press. Använd platshållarna [Namn] för mottagare och avsändare. " +
  "Referera till SKR:s takpris för rollen och zonen, den beräknade marginalen och föreslå den angivna " +
  "målersättningen. Max cirka 180 ord per utkast.";

interface GatewayContentPart {
  type: string;
  [key: string]: unknown;
}

async function callGateway(
  apiKey: string,
  system: string,
  userContent: string | GatewayContentPart[],
  tool: unknown,
  toolName: string,
): Promise<{ args: unknown; usage: Record<string, number> }> {
  let response: Response;
  try {
    response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: BETA_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: toolName } },
      }),
    });
  } catch (err) {
    console.error("beta AI: nätverksfel mot gateway", err instanceof Error ? err.message : "okänt");
    throw new BetaAiError("AI-tjänsten kunde inte nås just nu. Försök igen om en stund.", 502);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("beta AI: gateway svarade", response.status, detail.slice(0, 300));
    if (response.status === 429) {
      throw new BetaAiError(
        "AI-tjänsten är hårt belastad just nu. Vänta en stund och försök igen.",
        502,
      );
    }
    if (response.status === 402 || response.status === 403) {
      throw new BetaAiError(
        "AI-analysen är tillfälligt otillgänglig. Tjänstens AI-utrymme behöver fyllas på.",
        502,
      );
    }
    throw new BetaAiError("AI-analysen misslyckades. Försök igen om en stund.", 502);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        tool_calls?: Array<{ function?: { arguments?: string } }>;
      };
    }>;
    usage?: Record<string, number>;
  };

  const raw = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!raw) {
    console.error("beta AI: inget strukturerat svar från modellen");
    throw new BetaAiError("AI-analysen gav inget läsbart svar. Försök igen.", 502);
  }

  try {
    return { args: JSON.parse(raw), usage: data.usage ?? {} };
  } catch {
    console.error("beta AI: kunde inte tolka modellens svar som JSON");
    throw new BetaAiError("AI-analysen gav inget läsbart svar. Försök igen.", 502);
  }
}

export async function extractContract(
  apiKey: string,
  input: { text?: string; fileBase64?: string; mimeType?: string },
): Promise<{ extracted: ExtractedContract; usage: Record<string, number> }> {
  const parts: GatewayContentPart[] = [];
  parts.push({
    type: "text",
    text: input.text?.trim()
      ? `Analysera följande underlag:\n\n${input.text.trim()}`
      : "Analysera det bifogade dokumentet.",
  });

  if (input.fileBase64 && input.mimeType) {
    const dataUrl = `data:${input.mimeType};base64,${input.fileBase64}`;
    if (input.mimeType === "application/pdf") {
      parts.push({
        type: "file",
        file: { filename: "underlag.pdf", file_data: dataUrl },
      });
    } else {
      parts.push({ type: "image_url", image_url: { url: dataUrl } });
    }
  }

  const { args, usage } = await callGateway(
    apiKey,
    EXTRACT_SYSTEM_PROMPT,
    parts,
    EXTRACT_TOOL,
    "leverera_analys",
  );
  return { extracted: args as ExtractedContract, usage };
}

export async function generateCounterOffers(
  apiKey: string,
  facts: {
    profession: string;
    specialty: string | null;
    region: string | null;
    zone: number;
    benchmark_rate: number;
    offered_rate: number;
    margin_pct: number;
    counter_target_rate_user_terms: number;
    compensation_type: string;
    flagged_issues: Array<{ title: string; detail: string }>;
  },
): Promise<{ soft: string; sharp: string; usage: Record<string, number> }> {
  const brief = [
    `Yrke: ${facts.profession}`,
    `Roll enligt ramavtal: ${facts.specialty ?? "ej angiven"}`,
    `Plats: ${facts.region ?? "ej angiven"} (zon ${facts.zone})`,
    `SKR:s takpris för rollen och zonen: ${facts.benchmark_rate} kr/h`,
    `Erbjuden ersättning: ${facts.offered_rate} kr/h (${facts.compensation_type})`,
    `Beräknad marginal för bemanningsbolaget: ${facts.margin_pct} %`,
    `Föreslagen målersättning: ${facts.counter_target_rate_user_terms} kr/h`,
    `Villkor att beröra: ${facts.flagged_issues.map((i) => i.title).join("; ") || "inga"}`,
  ].join("\n");

  const { args, usage } = await callGateway(
    apiKey,
    COUNTER_SYSTEM_PROMPT,
    `Skriv de två mejlutkasten utifrån dessa uppgifter:\n\n${brief}`,
    COUNTER_TOOL,
    "leverera_motbud",
  );
  const out = args as { soft?: string; sharp?: string };
  return { soft: out.soft ?? "", sharp: out.sharp ?? "", usage };
}
