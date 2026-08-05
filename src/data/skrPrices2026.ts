/**
 * SKR Ramavtal Vårdbemanning 2026 — canonical price lookup.
 *
 * Mirrors `contract_version_rates` rows where `version_label = 'v1.7'` (nurses,
 * effective 2026-01-01). DB remains source of truth; this file is the typed
 * SSR/offline fallback and guard against drift.
 *
 * Bind every role 1:1 against its exact price row. There is NO generic
 * "Specialistsjuksköterska" entry — that string must never resolve to a price.
 *
 * Price groups (sjuksköterskor v1.7):
 *  - "bas"     616 / 660 / 715  Sjuksköterska grundutbildning, Röntgensjuksköterska
 *  - "mellan"  715 / 770 / 824  Skolsköterska + alla "Specialistsjuksköterska …"
 *                               UTOM de fyra i grupp "hog"
 *  - "hog"     770 / 824 / 880  Barnmorska, Distriktssjuksköterska,
 *                               Specialistsjuksköterska anestesi,
 *                               Specialistsjuksköterska intensivvård,
 *                               Specialistsjuksköterska operationssjukvård
 */

export type PriceGroup = "bas" | "mellan" | "hog";
export type ContractVersion = "v1.7";

export interface RolePrice {
  /** Canonical role string — matches contract_version_rates.yrkeskategori */
  role: string;
  group: PriceGroup;
  zone1: number;
  zone2: number;
  zone3: number;
  contractVersion: ContractVersion;
}

const bas = (role: string): RolePrice => ({
  role,
  group: "bas",
  zone1: 616,
  zone2: 660,
  zone3: 715,
  contractVersion: "v1.7",
});

const mellan = (role: string): RolePrice => ({
  role,
  group: "mellan",
  zone1: 715,
  zone2: 770,
  zone3: 824,
  contractVersion: "v1.7",
});

const hog = (role: string): RolePrice => ({
  role,
  group: "hog",
  zone1: 770,
  zone2: 824,
  zone3: 880,
  contractVersion: "v1.7",
});

/**
 * Endast dessa fem roller har den höga prisnivån (770/824/880).
 * Källa: SKR ramavtal vårdbemanning 2026, prisbilaga sjuksköterskor.
 * Bekräftat av vårdbemanning.ai 2026-01.
 */
export const HIGH_GROUP_ROLES = [
  "Barnmorska",
  "Distriktssjuksköterska",
  "Specialistsjuksköterska anestesi",
  "Specialistsjuksköterska intensivvård",
  "Specialistsjuksköterska operationssjukvård",
] as const;

export const SKR_2026_NURSE_PRICES: readonly RolePrice[] = [
  // ── bas (616 / 660 / 715) ─────────────────────────────────────────────────
  bas("Sjuksköterska"),
  bas("Röntgensjuksköterska"),

  // ── hog (770 / 824 / 880) — endast dessa fem ──────────────────────────────
  hog("Barnmorska"),
  hog("Distriktssjuksköterska"),
  hog("Specialistsjuksköterska anestesi"),
  hog("Specialistsjuksköterska intensivvård"),
  hog("Specialistsjuksköterska operationssjukvård"),

  // ── mellan (715 / 770 / 824) ──────────────────────────────────────────────
  mellan("Skolsköterska"),
  mellan("Specialistsjuksköterska akutsjukvård"),
  mellan("Specialistsjuksköterska ambulanssjukvård"),
  mellan("Specialistsjuksköterska barn och ungdom"),
  mellan("Specialistsjuksköterska diabetesvård"),
  mellan("Specialistsjuksköterska företagshälsovård"),
  mellan("Specialistsjuksköterska hjärtsjukvård"),
  mellan("Specialistsjuksköterska infektionssjukvård"),
  mellan("Specialistsjuksköterska kirurgisk vård"),
  mellan("Specialistsjuksköterska medicinsk vård"),
  mellan("Specialistsjuksköterska onkologisk vård"),
  mellan("Specialistsjuksköterska palliativ vård"),
  mellan("Specialistsjuksköterska psykiatrisk vård"),
  mellan("Specialistsjuksköterska vård av äldre"),
  mellan("Specialistsjuksköterska ögonsjukvård"),
];

export const PRICE_BY_ROLE: Readonly<Record<string, RolePrice>> = Object.freeze(
  Object.fromEntries(SKR_2026_NURSE_PRICES.map((r) => [r.role, r])),
);

/** Sentinel used by UI when a user has not picked a specific specialty. */
export const MISSING_SPECIALTY_SENTINEL = "__SPECIALITY_MISSING__";

/** Lowercased alias map → canonical role. Extend conservatively. */
const ALIAS_TO_ROLE: Readonly<Record<string, string>> = Object.freeze({
  // bas
  "sjuksköterska": "Sjuksköterska",
  "legitimerad sjuksköterska": "Sjuksköterska",
  "allmänsjuksköterska": "Sjuksköterska",
  "leg sjuksköterska": "Sjuksköterska",
  "leg. sjuksköterska": "Sjuksköterska",
  "ssk": "Sjuksköterska",
  "leg ssk": "Sjuksköterska",
  "röntgensjuksköterska": "Röntgensjuksköterska",
  // hog
  "barnmorska": "Barnmorska",
  "distriktssjuksköterska": "Distriktssjuksköterska",
  "dsk": "Distriktssjuksköterska",
  "anestesisjuksköterska": "Specialistsjuksköterska anestesi",
  "iva-sjuksköterska": "Specialistsjuksköterska intensivvård",
  "iva sjuksköterska": "Specialistsjuksköterska intensivvård",
  "intensivvårdssjuksköterska": "Specialistsjuksköterska intensivvård",
  "operationssjuksköterska": "Specialistsjuksköterska operationssjukvård",
  // mellan
  "skolsköterska": "Skolsköterska",
  "akutsjuksköterska": "Specialistsjuksköterska akutsjukvård",
  "ambulanssjuksköterska": "Specialistsjuksköterska ambulanssjukvård",
  "barnsjuksköterska": "Specialistsjuksköterska barn och ungdom",
  "diabetessjuksköterska": "Specialistsjuksköterska diabetesvård",
  "företagshälsosjuksköterska": "Specialistsjuksköterska företagshälsovård",
  "hjärtsjuksköterska": "Specialistsjuksköterska hjärtsjukvård",
  "infektionssjuksköterska": "Specialistsjuksköterska infektionssjukvård",
  "kirurgsjuksköterska": "Specialistsjuksköterska kirurgisk vård",
  "medicinsjuksköterska": "Specialistsjuksköterska medicinsk vård",
  "onkologisjuksköterska": "Specialistsjuksköterska onkologisk vård",
  "palliativsjuksköterska": "Specialistsjuksköterska palliativ vård",
  "psykiatrisjuksköterska": "Specialistsjuksköterska psykiatrisk vård",
  "geriatriksjuksköterska": "Specialistsjuksköterska vård av äldre",
  "ögonsjuksköterska": "Specialistsjuksköterska ögonsjukvård",
});

/** Resolve a role string (canonical or alias) to a price row, or null if unknown. */
export function lookupRolePrice(roleOrAlias: string | null | undefined): RolePrice | null {
  if (!roleOrAlias) return null;
  const trimmed = roleOrAlias.trim();
  if (!trimmed || trimmed === MISSING_SPECIALTY_SENTINEL) return null;
  // Reject the bare generic — must never resolve to a price.
  if (trimmed.toLowerCase() === "specialistsjuksköterska") return null;
  if (PRICE_BY_ROLE[trimmed]) return PRICE_BY_ROLE[trimmed];
  const aliased = ALIAS_TO_ROLE[trimmed.toLowerCase()];
  return aliased ? PRICE_BY_ROLE[aliased] ?? null : null;
}
