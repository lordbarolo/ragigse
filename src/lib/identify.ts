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
    posthog.identify(userId, properties);
  } catch {
    /* silent */
  }
}

/**
 * Associates the current anonymous PostHog session with a lead_id.
 * Uses alias() so all prior anonymous events (landing_viewed, survey_started, etc.)
 * are stitched to the same person — preserving the full funnel.
 *
 * Also registers lead_id as a super-property so it auto-attaches to all future events,
 * and sets it as a person-property for cohort/funnel grouping in PostHog.
 */
export function aliasLead(
  leadId: string,
  personProps?: Record<string, string | number | boolean | null | undefined>
) {
  try {
    // Stitch anonymous distinct_id → leadId (preserves prior funnel events)
    posthog.alias(leadId);

    // Auto-attach lead_id to all future events
    posthog.register({ lead_id: leadId });

    // Set person-level properties for funnel grouping
    if (personProps && Object.keys(personProps).length > 0) {
      posthog.setPersonProperties({ lead_id: leadId, ...personProps });
    } else {
      posthog.setPersonProperties({ lead_id: leadId });
    }
  } catch {
    /* silent */
  }
}

/**
 * Attaches email + optional metadata to the current PostHog person
 * (which should already be a lead via aliasLead). Does NOT change distinct_id —
 * we keep lead_id as the stable identifier so the full anonymous → lead → user
 * funnel stays stitched together.
 */
export function identifyLeadWithEmail(
  leadId: string,
  email: string,
  extra?: Record<string, string | number | boolean | null | undefined>
) {
  try {
    posthog.identify(leadId, {
      email,
      lead_id: leadId,
      email_collected_at: new Date().toISOString(),
      ...(extra || {}),
    });
    posthog.register({ email });
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
 * Closes the signup loop. Fires two dedup'd events the first time we detect
 * an email-confirmed session:
 *   - `signup_confirmed`: email link clicked (closes initiated → confirmed)
 *   - `signup_completed`: user is now actively in the product (separate key
 *     so we can later gate this on real onboarding completion).
 * Both dedup'd via localStorage so refresh/relogin won't double-count.
 */
function maybeFireSignupConfirmed(user: { id: string; email_confirmed_at?: string | null; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }) {
  try {
    if (!user.email_confirmed_at) return;
    const role = (user.user_metadata?.role as string) || "individual";

    import("@/lib/trackEvent").then(({ trackEvent }) => {
      const confirmedKey = `signup_confirmed:${user.id}`;
      if (!localStorage.getItem(confirmedKey)) {
        localStorage.setItem(confirmedKey, "1");
        trackEvent("signup_confirmed", { method: "email", role });
      }
      const completedKey = `signup_completed:${user.id}`;
      if (!localStorage.getItem(completedKey)) {
        localStorage.setItem(completedKey, "1");
        trackEvent("signup_completed", { method: "email", role });
      }
    }).catch(() => { /* silent */ });
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
      maybeFireSignupConfirmed(session.user);
    }
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
      if (session?.user) {
        identifyUser(session.user.id, {
          email: session.user.email ?? undefined,
        });
        maybeFireSignupConfirmed(session.user);
      }
    } else if (event === "SIGNED_OUT") {
      resetIdentity();
    }
  });
}
