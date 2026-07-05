// ai-transport
// Env-styrd transport-konfiguration för AI-anrop.
// Utan env-variabler = identiskt beteende som tidigare hårdkodning:
//   URL:   https://ai.gateway.lovable.dev/v1/chat/completions
//   KEY:   LOVABLE_API_KEY
//   MODEL: google/gemini-2.5-flash
//
// Sätt AI_GATEWAY_URL / AI_GATEWAY_KEY / AI_MODEL i edge-function-secrets
// för att peka om till annan OpenAI-kompatibel gateway (t.ex. direkt Google/OpenRouter).

const DEFAULT_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

export function getAiGatewayUrl(): string {
  return Deno.env.get("AI_GATEWAY_URL") || DEFAULT_URL;
}

export function getAiGatewayKey(): string | undefined {
  return Deno.env.get("AI_GATEWAY_KEY") || Deno.env.get("LOVABLE_API_KEY") || undefined;
}

export function getAiModel(fallback: string = DEFAULT_MODEL): string {
  return Deno.env.get("AI_MODEL") || fallback;
}
