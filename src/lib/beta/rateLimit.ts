import type { SupabaseClient } from "@supabase/supabase-js";

/** Konstant salt för IP-hashning i beta-flödet (ingen ny secret krävs). */
const IP_SALT = "vardbemanning-beta-avtalsgranskare-2026";

export function clientIpFrom(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("cf-connecting-ip") || "unknown";
}

export async function hashIp(ip: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${IP_SALT}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Räknar anrop per IP och dygn för en given scope och loggar det aktuella anropet.
 * Returnerar true när gränsen är nådd (anropet ska nekas).
 */
export async function isRateLimited(
  supabase: SupabaseClient,
  request: Request,
  scope: string,
  dailyLimit: number,
): Promise<boolean> {
  const ipHash = await hashIp(clientIpFrom(request));
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("beta_rate_limit_log")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("scope", scope)
    .gte("created_at", since);

  if (error) {
    console.error("beta rate limit: kunde inte läsa loggen", error.message);
    return false;
  }
  if ((count ?? 0) >= dailyLimit) return true;

  await supabase.from("beta_rate_limit_log").insert({ ip_hash: ipHash, scope });
  return false;
}
