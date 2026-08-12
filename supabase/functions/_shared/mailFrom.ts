// Central avsändardomän för alla utgående mejl (Resend).
// Endast domäner som är verifierade i Resend och som den aktiva nyckeln har
// sending access till får användas. RESEND_FROM_DOMAIN kan peka på en
// subdomän av vardbemanning.ai, men aldrig på en gammal/overifierad domän
// (t.ex. compcare.se) — då faller vi tillbaka på rotdomänen.
const ROOT_DOMAIN = "vardbemanning.ai";

function resolveDomain(): string {
  const raw = (Deno.env.get("RESEND_FROM_DOMAIN") || "").trim().toLowerCase();
  if (raw === ROOT_DOMAIN || raw.endsWith(`.${ROOT_DOMAIN}`)) return raw;
  return ROOT_DOMAIN;
}

export const FROM_DOMAIN = resolveDomain();

// ASCII-namn: Resend avvisar From-headers med icke-ASCII-tecken (422).
export const SITE_NAME = "vardbemanning.ai";

/** Bygger en From-header, t.ex. fromAddress() eller fromAddress("Health"). */
export function fromAddress(suffix?: string): string {
  const name = suffix ? `${SITE_NAME} ${suffix}` : SITE_NAME;
  return `${name} <noreply@${FROM_DOMAIN}>`;
}
