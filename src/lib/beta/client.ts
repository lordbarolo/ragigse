import { z } from "zod";
import type {
  BetaAnalysisInput,
  BetaAnalysisResult,
  BetaApiErrorBody,
  BetaCompensationType,
  BetaManualOverride,
  BetaProfession,
} from "./types";

export const BETA_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const BETA_ALLOWED_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

const manualOverrideSchema = z.object({
  profession: z.enum(["Läkare", "Sjuksköterska"]),
  specialty: z.string().trim().min(1, "Ange specialitet").max(120, "Max 120 tecken"),
  region: z.string().trim().min(1, "Ange region eller ort").max(120, "Max 120 tecken"),
  compensation_type: z.enum(["AB", "Faktura", "Anställd", "Okänt"]),
  offered_rate: z.number().finite().positive("Ersättningen måste vara större än 0").max(100_000),
});

const emailSchema = z.string().trim().email("Ange en giltig e-postadress").max(255);

export class BetaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly extracted?: Partial<BetaAnalysisResult["extracted"]>,
  ) {
    super(message);
  }
}

export function validateBetaFile(file: File): string | null {
  if (!BETA_ALLOWED_MIME.includes(file.type as (typeof BETA_ALLOWED_MIME)[number])) {
    return "Filtypen stöds inte. Välj PDF, PNG, JPG eller WEBP.";
  }
  if (file.size > BETA_MAX_FILE_BYTES) return "Filen är för stor. Max 10 MB.";
  return null;
}

export function validateManualOverride(input: {
  profession: BetaProfession;
  specialty: string;
  region: string;
  compensation_type: BetaCompensationType;
  offered_rate: number;
}): BetaManualOverride {
  return manualOverrideSchema.parse(input);
}

export function validateBetaEmail(email: string): string {
  return emailSchema.parse(email);
}

export async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Filen kunde inte läsas."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex < 0) throw new Error("Filen kunde inte läsas.");
  return dataUrl.slice(commaIndex + 1);
}

export async function analyzeBetaContract(input: BetaAnalysisInput): Promise<BetaAnalysisResult> {
  const response = await fetch("/api/public/beta/analyze-contract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = (await response.json().catch(() => ({}))) as BetaAnalysisResult & BetaApiErrorBody;
  if (!response.ok) {
    const message =
      response.status === 429
        ? "Du har nått dagens gräns på 10 granskningar. Välkommen tillbaka i morgon."
        : response.status === 502
          ? "AI-tjänsten svarar inte just nu. Försök igen om en stund."
          : body.error || "Analysen kunde inte genomföras. Försök igen.";
    throw new BetaApiError(message, response.status, body.extracted);
  }
  return body;
}

export async function recordBetaEvent(input: {
  analysisId: string;
  event: "copied" | "save_email" | "lead_opt_in";
  email?: string;
}): Promise<void> {
  const response = await fetch("/api/public/beta/analysis-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      analysis_id: input.analysisId,
      event: input.event,
      ...(input.email ? { email: validateBetaEmail(input.email) } : {}),
    }),
  });
  const body = (await response.json().catch(() => ({}))) as BetaApiErrorBody;
  if (!response.ok) throw new BetaApiError(body.error || "Händelsen kunde inte sparas.", response.status);
}
