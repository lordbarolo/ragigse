import posthog from "@/lib/posthog";
import { supabase } from "@/integrations/supabase/client";

/**
 * Associates the current PostHog session with an authenticated user.
 * Safe to call multiple times — PostHog dedupes internally.
 * Only runs when the user has opted in to analytics cookies.
 */
export function identifyUser(
  userId: string,
  properties?: Record<string, string | number | boolean | null | undefined>
) {
  try {
    if (!posthog.has_opted_in_capturing()) return;
    posthog.identify(userId, properties);
  } catch {
    /* silent */
  }
}

export function resetIdentity() {
  try {
    posthog.reset();
  } catch {
    /* silent */
  }
}

/**
 * Wires a global auth listener so identify() is called automatically
 * whenever Supabase confirms a session (login, token refresh, page reload).
 * Also resets PostHog on sign-out.
 */
export function initAuthIdentitySync() {
  // Identify on initial load if a session already exists
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      identifyUser(session.user.id, {
        email: session.user.email ?? undefined,
      });
    }
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
      if (session?.user) {
        identifyUser(session.user.id, {
          email: session.user.email ?? undefined,
        });
      }
    } else if (event === "SIGNED_OUT") {
      resetIdentity();
    }
  });
}
