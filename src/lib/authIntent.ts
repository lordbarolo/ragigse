// Maps "intent" query param on /logga-in and /registrera to a contextual
// banner so the auth view feels like a natural step instead of a dead-end.

export type AuthIntent = "negotiate";

export interface AuthIntentCopy {
  eyebrow: string;
  title: string;
  description: string;
}

const INTENT_COPY: Record<AuthIntent, AuthIntentCopy> = {
  negotiate: {
    eyebrow: "Ett steg kvar",
    title: "Logga in för att öppna Löneassistenten",
    description:
      "Löneassistenten är personlig och kräver att du är inloggad. Skapa ett gratis konto eller logga in – sedan tar vi dig direkt vidare.",
  },
};

const SIGNUP_COPY: Record<AuthIntent, AuthIntentCopy> = {
  negotiate: {
    eyebrow: "Ett steg kvar",
    title: "Skapa konto för att öppna Löneassistenten",
    description:
      "Kontot är gratis och tar 30 sekunder. När du är inloggad öppnas Löneassistenten direkt.",
  },
};

export function getAuthIntentCopy(intent: string | null): AuthIntentCopy | null {
  if (!intent) return null;
  return INTENT_COPY[intent as AuthIntent] ?? null;
}

export function getSignupIntentCopy(intent: string | null): AuthIntentCopy | null {
  if (!intent) return null;
  return SIGNUP_COPY[intent as AuthIntent] ?? null;
}

/**
 * Validate a redirect target so we never honor cross-origin or protocol-relative
 * URLs from the query string. Only same-app absolute paths are accepted.
 */
export function sanitizeRedirect(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  // Aldrig redirecta tillbaka till auth-sidorna — det skapar loopar.
  if (/^\/(logga-in|registrera|aterstall-losenord)/.test(raw)) return null;
  return raw;
}

/** Build `?redirect=…&intent=…` (with leading "?") for auth links. */
export function buildAuthQuery(
  redirect: string,
  intent: AuthIntent | string,
): string {
  const params = new URLSearchParams({ redirect, intent });
  return `?${params.toString()}`;
}
