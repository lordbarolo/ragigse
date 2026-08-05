// Server-only rate limiting against the existing rate_limit_log table
// (same table and semantics as supabase/functions/_shared/rateLimit.ts).
// Fails open on DB errors so a logging hiccup never blocks a legitimate user.

type AdminClient = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  retryAfterSeconds: number;
}

export async function checkRateLimit(
  supabase: AdminClient,
  endpoint: string,
  clientKey: string,
  maxRequests: number,
  windowMinutes = 60,
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const retryAfterSeconds = windowMinutes * 60;

  const { count, error } = await supabase
    .from("rate_limit_log")
    .select("id", { count: "exact", head: true })
    .eq("endpoint", endpoint)
    .eq("client_ip", clientKey)
    .gte("created_at", windowStart);

  if (error) {
    console.error(`[rate-limit] count failed for ${endpoint}`, error.message);
    return { allowed: true, count: 0, limit: maxRequests, retryAfterSeconds };
  }

  const currentCount = count ?? 0;
  if (currentCount >= maxRequests) {
    return { allowed: false, count: currentCount, limit: maxRequests, retryAfterSeconds };
  }

  const { error: insertError } = await supabase
    .from("rate_limit_log")
    .insert({ endpoint, client_ip: clientKey });
  if (insertError) {
    console.error(`[rate-limit] insert failed for ${endpoint}`, insertError.message);
  }

  return { allowed: true, count: currentCount + 1, limit: maxRequests, retryAfterSeconds };
}

/** Best-effort client IP from the incoming request headers. */
export function clientIpFrom(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("cf-connecting-ip") ||
    "unknown"
  );
}
