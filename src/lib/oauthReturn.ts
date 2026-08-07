/**
 * Avgör om den aktuella sidladdningen är en retur från en OAuth-omdirigering.
 * Används för att auth-sidorna inte ska auto-omdirigera vanliga besökare
 * (t.ex. någon som klickar "Gå till inloggning" efter registrering) bara
 * för att en gammal session ligger kvar i browsern.
 */
export function isOAuthReturn(): boolean {
  if (typeof window === "undefined") return false;
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return Boolean(
    search.get("code") ||
      search.get("access_token") ||
      search.get("error_description") ||
      hash.get("access_token") ||
      hash.get("refresh_token"),
  );
}
