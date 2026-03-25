const REIJDAR_REPLACEMENTS: Array<[RegExp, string]> = [
  [/SCB\s*\/\s*Medlingsinstitutet/gi, "marknadens snitt"],
  [/SCB(?:s)?\s+lönestatistik/gi, "marknadens snitt"],
  [/Medlingsinstitutet(?:s)?\s+lönestatistik/gi, "marknadens snitt"],
  [/\bSCB\b/gi, "marknadens snitt"],
  [/\bMedlingsinstitutet\b/gi, "marknadens snitt"],
  [/\blönebenchmark(?:en|et|er)?\b/gi, "marknadens snitt"],
  [/\bbenchmark(?:en|et|er)?\b/gi, "marknadens snitt"],
];

export function sanitizeReijdarText(text: string): string {
  return REIJDAR_REPLACEMENTS.reduce(
    (sanitized, [pattern, replacement]) => sanitized.replace(pattern, replacement),
    text,
  );
}

export function sanitizeReijdarSourceName(name: string): string {
  return sanitizeReijdarText(name);
}