// Shared helper to log AI gateway calls to ai_usage_logs table.
// Use logAiUsage() after every Lovable AI Gateway call.
//
// Pricing is per 1M tokens (USD). Update when Lovable AI publishes new prices.
// Source: Lovable docs + provider pricing pages.

const USD_TO_SEK = 10.5; // Approximate; recompute periodically

type ModelPricing = { inputPer1M: number; outputPer1M: number };

const PRICING: Record<string, ModelPricing> = {
  // Google Gemini
  "google/gemini-2.5-flash-lite": { inputPer1M: 0.10, outputPer1M: 0.40 },
  "google/gemini-2.5-flash": { inputPer1M: 0.30, outputPer1M: 2.50 },
  "google/gemini-3-flash-preview": { inputPer1M: 0.30, outputPer1M: 2.50 },
  "google/gemini-3.1-flash-image-preview": { inputPer1M: 0.30, outputPer1M: 2.50 },
  "google/gemini-2.5-pro": { inputPer1M: 1.25, outputPer1M: 10.00 },
  "google/gemini-3.1-pro-preview": { inputPer1M: 1.25, outputPer1M: 10.00 },
  "google/gemini-3-pro-image-preview": { inputPer1M: 1.25, outputPer1M: 10.00 },
  "google/gemini-2.5-flash-image": { inputPer1M: 0.30, outputPer1M: 2.50 },
  // OpenAI
  "openai/gpt-5-nano": { inputPer1M: 0.05, outputPer1M: 0.40 },
  "openai/gpt-5-mini": { inputPer1M: 0.25, outputPer1M: 2.00 },
  "openai/gpt-5": { inputPer1M: 1.25, outputPer1M: 10.00 },
  "openai/gpt-5.2": { inputPer1M: 1.50, outputPer1M: 12.00 },
};

const DEFAULT_PRICING: ModelPricing = { inputPer1M: 0.30, outputPer1M: 2.50 };

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): { costUsd: number; costSek: number } {
  const pricing = PRICING[model] ?? DEFAULT_PRICING;
  const costUsd =
    (inputTokens / 1_000_000) * pricing.inputPer1M +
    (outputTokens / 1_000_000) * pricing.outputPer1M;
  return {
    costUsd: Number(costUsd.toFixed(6)),
    costSek: Number((costUsd * USD_TO_SEK).toFixed(4)),
  };
}

export interface LogAiUsageArgs {
  feature: string; // e.g. "salary-assistant", "market-explain"
  model: string;
  userId?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  status?: "success" | "error" | "rate_limited" | "payment_required";
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Logs an AI usage event to public.ai_usage_logs.
 * Fire-and-forget — never throws. Errors are logged to console.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 */
export async function logAiUsage(args: LogAiUsageArgs): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      console.warn("[ai-usage-logger] missing SUPABASE env vars; skipping log");
      return;
    }

    const inputTokens = args.inputTokens ?? 0;
    const outputTokens = args.outputTokens ?? 0;
    const { costUsd, costSek } = calculateCost(args.model, inputTokens, outputTokens);

    const body = {
      user_id: args.userId ?? null,
      feature: args.feature,
      model: args.model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: costUsd,
      cost_sek: costSek,
      duration_ms: args.durationMs ?? null,
      status: args.status ?? "success",
      error_message: args.errorMessage ?? null,
      metadata: args.metadata ?? {},
    };

    const resp = await fetch(`${supabaseUrl}/rest/v1/ai_usage_logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("[ai-usage-logger] insert failed:", resp.status, text);
    }
  } catch (err) {
    console.error("[ai-usage-logger] unexpected error:", err);
  }
}

/**
 * Extracts token usage from a standard OpenAI-compatible chat completion response.
 * Works with Lovable AI Gateway responses.
 */
export function extractTokensFromResponse(json: unknown): {
  inputTokens: number;
  outputTokens: number;
} {
  const usage = (json as { usage?: { prompt_tokens?: number; completion_tokens?: number } })
    ?.usage;
  return {
    inputTokens: usage?.prompt_tokens ?? 0,
    outputTokens: usage?.completion_tokens ?? 0,
  };
}
