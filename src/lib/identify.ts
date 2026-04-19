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
    if (!posthog.has_opted_in_capturing()) return;

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
