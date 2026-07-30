/**
 * Roller får aldrig benämnas utåt som en grupp (t.ex. "Specialistläkare Grupp A").
 * Publika ytor visar endast den specifika rollen. Denna helper filtrerar bort
 * gruppetiketter som finns i backend/prisdata men aldrig ska exponeras i UI.
 */
const GROUP_LABEL = /\bgrupp\s*[a-zA-Z0-9]+\b/i;

export function isGroupLabelRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return GROUP_LABEL.test(role);
}

export function filterPublicRoles<T>(items: T[], getRole: (item: T) => string): T[] {
  return items.filter((item) => !isGroupLabelRole(getRole(item)));
}
