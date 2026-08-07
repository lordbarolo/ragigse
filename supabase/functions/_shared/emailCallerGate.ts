// Caller classification for e-mail sending edge functions.
//
// Purpose: prevent the functions from being used as an open spam/phishing
// relay from our verified sending domain. Three caller classes:
//
//   "service"  – internal call with the service-role key (other edge functions,
//                cron). Fully trusted.
//   "user"     – a signed-in end user (valid Supabase user JWT).
//   "anon"     – unauthenticated. Only allowed for a narrow allowlist of
//                self-service templates, and only with extra proof + rate limit.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type CallerKind = "service" | "user" | "anon";

export interface CallerIdentity {
  kind: CallerKind;
  userId?: string;
  email?: string;
}

function bearer(req: Request): string | null {
  const h = req.headers.get("Authorization") ?? "";
  if (!h.toLowerCase().startsWith("bearer ")) return null;
  const token = h.slice(7).trim();
  return token.length > 0 ? token : null;
}

/** Classify the caller. Never throws. */
export async function identifyCaller(req: Request): Promise<CallerIdentity> {
  const token = bearer(req);
  if (!token) return { kind: "anon" };

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && token === serviceKey) return { kind: "service" };

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  if (!anonKey || !url) return { kind: "anon" };

  // The anon key itself is not a user session.
  if (token === anonKey) return { kind: "anon" };

  try {
    const client = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await client.auth.getUser();
    if (error || !data?.user) return { kind: "anon" };
    return {
      kind: "user",
      userId: data.user.id,
      email: (data.user.email ?? "").toLowerCase() || undefined,
    };
  } catch {
    return { kind: "anon" };
  }
}

/** Best-effort client IP for rate limiting. */
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/** Stable, non-reversible rate-limit key for an e-mail address. */
export async function emailKey(email: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(email.trim().toLowerCase()),
  );
  return `email:${Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;
}
