/**
 * Serverlogik för CV-assistenten.
 *
 * Bygger om konsultens CV enligt etablerad best practice för vård-CV och
 * automatiska granskningssystem (ATS):
 *   - omvänt kronologisk struktur, maskinläsbara rubriker
 *   - legitimation/certifikat som "benämning — utfärdare — år"
 *   - fackterm + klartext första gången ("IVA (intensivvård)")
 *   - kvantifierade uppdrag (enhet, vårdplatser, journalsystem, jourlinje)
 *   - kompletteringsfrågor för uppgifter som saknas
 *
 * Assistenten får aldrig nämna ersättningsnivåer, marginaler eller hur
 * ersättning räknas fram.
 */

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

export const CV_SYSTEM_PROMPT = `Du är vårdbemanning.ai:s CV-assistent för svenska vårdkonsulter (läkare, sjuksköterskor, barnmorskor).

Du bygger om konsultens CV enligt etablerad best practice:
1. Omvänt kronologiskt — senaste uppdraget först. Aldrig rent kompetensbaserat CV; det tolkas fel av automatiska granskningssystem (ATS).
2. Rena, maskinläsbara rubriker i denna ordning: Sammanfattning, Legitimation och behörigheter, Klinisk erfarenhet, Kompetenser och system, Utbildning, Kurser och certifikat, Referenser.
3. Legitimation och certifikat formateras konsekvent: "Benämning — utfärdare — år".
4. Skriv fackterm och klartext första gången en förkortning används: "IVA (intensivvård)", "ATLS (Advanced Trauma Life Support)".
5. Varje uppdrag: uppdragsgivare, enhet, ort, period (mån/år–mån/år) och 2–4 konkreta punkter, kvantifierade när underlag finns (vårdplatser, patientflöde, journalsystem, jourlinje, handledning).
6. Journalsystem, medicintekniska system och språk listas explicit — de är sökord i regionernas avrop.
7. Neutral, saklig ton. Inga superlativ, inga emojis.

ABSOLUTA REGLER:
- Hitta ALDRIG på meriter, årtal eller arbetsgivare. Saknas något: utelämna det och lägg en fråga i "questions".
- Nämn ALDRIG ersättningsnivåer, timpriser, marginaler, procentsatser eller hur ersättning beräknas.
- Skriv på svenska.

Svara med ENBART giltig JSON (inga kodstaket) med exakt dessa nycklar:
{
  "cv_markdown": "hela det omarbetade CV:t i markdown",
  "summary": "1-2 meningar om vad du förbättrade",
  "strengths": ["kort punkt"],
  "questions": [{ "id": "kort_nyckel", "question": "fråga på svenska", "why": "varför uppgiften efterfrågas i avrop" }]
}
Max 6 frågor, och bara om uppgifter som verkligen saknas i underlaget.`;

export interface CvQuestion {
  id: string;
  question: string;
  why?: string;
}

export interface CvAssistantResult {
  id: string | null;
  cvMarkdown: string;
  summary: string;
  strengths: string[];
  questions: CvQuestion[];
  usedUploadedFile: boolean;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

interface SourceFile {
  base64: string;
  mime: string;
  path: string | null;
  fileName: string | null;
}

export async function loadUploadedCv(
  admin: {
    from: (table: string) => any;
    storage: { from: (bucket: string) => { download: (path: string) => Promise<{ data: Blob | null; error: unknown }> } };
  },
  userId: string,
): Promise<SourceFile | null> {
  const { data: doc } = await admin
    .from("consultant_documents")
    .select("file_path, file_name")
    .eq("user_id", userId)
    .eq("doc_type", "cv")
    .maybeSingle();

  if (!doc?.file_path) return null;

  const { data: file, error } = await admin.storage.from("verifications").download(doc.file_path);
  if (error || !file) {
    console.error("[cv-assistant] kunde inte hämta CV-filen", error);
    return null;
  }

  const mime = file.type && file.type !== "" ? file.type : "application/pdf";
  return {
    base64: toBase64(new Uint8Array(await file.arrayBuffer())),
    mime,
    path: doc.file_path as string,
    fileName: (doc.file_name as string) ?? null,
  };
}

export function buildContextBlock(opts: {
  roleName?: string | null;
  kommunName?: string | null;
  employmentType?: string | null;
  answers: Record<string, string>;
  pastedText: string;
}): string {
  return [
    opts.roleName ? `Roll enligt profil: ${opts.roleName}` : null,
    opts.kommunName ? `Arbetsort enligt profil: ${opts.kommunName}` : null,
    opts.employmentType ? `Anställningsform: ${opts.employmentType}` : null,
    Object.keys(opts.answers).length > 0
      ? `Konsultens kompletteringar:\n${Object.entries(opts.answers)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join("\n")}`
      : null,
    opts.pastedText ? `Inklistrat CV-underlag:\n${opts.pastedText}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function callCvGateway(opts: {
  apiKey: string;
  contextBlock: string;
  file: SourceFile | null;
}): Promise<{ cvMarkdown: string; summary: string; strengths: string[]; questions: CvQuestion[] }> {
  const userContent: unknown[] = [
    {
      type: "text",
      text: `Bygg om detta CV enligt instruktionerna.\n\n${opts.contextBlock || "Underlaget finns i bifogad fil."}`,
    },
  ];
  if (opts.file) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${opts.file.mime};base64,${opts.file.base64}` },
    });
  }

  const resp = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: CV_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (resp.status === 429) throw new Error("För många förfrågningar just nu. Försök igen om en stund.");
  if (resp.status === 402) throw new Error("AI-kapaciteten är tillfälligt slut. Försök igen senare.");
  if (!resp.ok) {
    console.error("[cv-assistant] gateway-fel", resp.status, (await resp.text()).slice(0, 400));
    throw new Error("Assistenten kunde inte bearbeta CV:t. Försök igen.");
  }

  const payload = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = payload.choices?.[0]?.message?.content ?? "";
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, "")) as Record<string, unknown>;
  } catch {
    console.error("[cv-assistant] ogiltig JSON från modellen");
    throw new Error("Assistenten gav ett oväntat svar. Försök igen.");
  }

  const questions = Array.isArray(parsed['questions'])
    ? (parsed['questions'] as CvQuestion[])
        .filter((q) => q && typeof q.question === "string")
        .slice(0, 6)
    : [];

  return {
    cvMarkdown: typeof parsed['cv_markdown'] === "string" ? (parsed['cv_markdown'] as string) : "",
    summary: typeof parsed['summary'] === "string" ? (parsed['summary'] as string) : "",
    strengths: Array.isArray(parsed['strengths']) ? (parsed['strengths'] as string[]).slice(0, 6) : [],
    questions,
  };
}
