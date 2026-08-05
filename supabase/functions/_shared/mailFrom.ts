// Central avsändardomän för alla utgående mejl.
// Styrs av RESEND_FROM_DOMAIN (måste vara en verifierad domän i Resend
// som den aktiva RESEND_API_KEY har sending access till).
export const FROM_DOMAIN =
  Deno.env.get("RESEND_FROM_DOMAIN") || "vardbemanning.ai";

export const SITE_NAME = "vårdbemanning.ai";

/** Bygger en From-header, t.ex. fromAddress() eller fromAddress("Health"). */
export function fromAddress(suffix?: string): string {
  const name = suffix ? `${SITE_NAME} ${suffix}` : SITE_NAME;
  return `${name} <noreply@${FROM_DOMAIN}>`;
}
