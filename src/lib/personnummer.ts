/** Normaliserar och validerar svenskt personnummer (Luhn/mod-10). */

export function normalizePersonnummer(input: string): string | null {
  const digits = input.replace(/[^0-9]/g, "");
  let ten: string;
  if (digits.length === 12) {
    ten = digits.slice(2);
  } else if (digits.length === 10) {
    ten = digits;
  } else {
    return null;
  }

  const month = Number(ten.slice(2, 4));
  const day = Number(ten.slice(4, 6));
  // Samordningsnummer har dag + 60.
  const realDay = day > 60 ? day - 60 : day;
  if (month < 1 || month > 12 || realDay < 1 || realDay > 31) return null;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const d = Number(ten[i]);
    const v = i % 2 === 0 ? d * 2 : d;
    sum += v > 9 ? v - 9 : v;
  }
  const check = (10 - (sum % 10)) % 10;
  if (check !== Number(ten[9])) return null;

  return digits.length === 12 ? `${digits.slice(0, 2)}${ten}` : ten;
}

export function isValidPersonnummer(input: string): boolean {
  return normalizePersonnummer(input) !== null;
}

/** Maskerar personnummer för visning: 19850101-XXXX */
export function maskPersonnummer(input: string): string {
  const n = normalizePersonnummer(input);
  if (!n) return "";
  return `${n.slice(0, n.length - 4)}-XXXX`;
}
