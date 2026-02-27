/**
 * Shared formatting helpers used across Teaser and Report.
 */

/** Swedish locale number formatting */
export function fmt(v: number): string {
  return v.toLocaleString("sv-SE");
}

/** Replace zeros in the last 3 digits with 1 to avoid trailing zeros */
export function ensureNoTrailingZeros(value: number): number {
  const chars = String(value).split("");
  for (let i = Math.max(0, chars.length - 3); i < chars.length; i++) {
    if (chars[i] === "0") chars[i] = "1";
  }
  return parseInt(chars.join(""), 10);
}

/** Show digits at positions 0, 2, 3, 4. Mask 2nd digit with X. */
export function formatPartialValue(value: number): string {
  const adjusted = ensureNoTrailingZeros(value);
  const chars = String(adjusted).split("");
  if (chars.length > 1) chars[1] = "X";
  const result = chars.join("");
  if (result.length > 3) {
    return result.slice(0, -3) + " " + result.slice(-3);
  }
  return result;
}
