/**
 * Mask an email address for safe logging: keep first 2 chars + domain.
 * Example: johndoe@example.com -> jo***@example.com
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== "string") return "(none)";
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const keep = local.slice(0, Math.min(2, local.length));
  return `${keep}***@${domain}`;
}
