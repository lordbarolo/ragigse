import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  retryAfterSeconds?: number;
}

/**
 * Check rate limit for a given endpoint + client IP.
 * Uses the rate_limit_log table (service_role only).
 *
 * @param supabase - service_role client
 * @param endpoint - e.g. "validate-coupon"
 * @param clientIp - from x-forwarded-for
 * @param maxRequests - max allowed in window
 * @param windowMinutes - time window in minutes (default 60)
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  endpoint: string,
  clientIp: string,
  maxRequests: number,
  windowMinutes = 60
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  // Count recent requests
  const { count, error } = await supabase
    .from("rate_limit_log")
    .select("id", { count: "exact", head: true })
    .eq("endpoint", endpoint)
    .eq("client_ip", clientIp)
    .gte("created_at", windowStart);

  if (error) {
    console.error(`[RATE_LIMIT] Count error for ${endpoint}:`, error);
    // Fail open — don't block on DB errors
    return { allowed: true, count: 0, limit: maxRequests };
  }

  const currentCount = count ?? 0;

  if (currentCount >= maxRequests) {
    return {
      allowed: false,
      count: currentCount,
      limit: maxRequests,
      retryAfterSeconds: windowMinutes * 60,
    };
  }

  // Log this request
  const { error: insertError } = await supabase
    .from("rate_limit_log")
    .insert({ endpoint, client_ip: clientIp });

  if (insertError) {
    console.error(`[RATE_LIMIT] Insert error for ${endpoint}:`, insertError);
  }

  return { allowed: true, count: currentCount + 1, limit: maxRequests };
}

/**
 * Build a 429 response with standard headers.
 */
export function rateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      retry_after_seconds: result.retryAfterSeconds,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSeconds ?? 3600),
      },
    }
  );
}
