/**
 * Sveriges 21 regioner (officiella benämningar 2026).
 * Används för dropdown-val i representationsintyg.
 */
export const SWEDISH_REGIONS = [
  "Region Blekinge",
  "Region Dalarna",
  "Region Gotland",
  "Region Gävleborg",
  "Region Halland",
  "Region Jämtland Härjedalen",
  "Region Jönköpings län",
  "Region Kalmar län",
  "Region Kronoberg",
  "Region Norrbotten",
  "Region Skåne",
  "Region Stockholm",
  "Region Sörmland",
  "Region Uppsala",
  "Region Värmland",
  "Region Västerbotten",
  "Region Västernorrland",
  "Region Västmanland",
  "Region Örebro län",
  "Region Östergötland",
  "Västra Götalandsregionen",
] as const;

export type SwedishRegion = (typeof SWEDISH_REGIONS)[number];
