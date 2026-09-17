// Ren kalkyl för AI-avtalsgranskaren (beta). Inga externa beroenden.

export type CompensationType = "AB" | "Faktura" | "Anställd" | "Okänt";
export type MarginTier = "green" | "yellow" | "red";

/** Schablon: arbetsgivaravgift + semester + pension. */
export const EMPLOYED_TO_INVOICE_FACTOR = 1.45;
export const HOUSING_COST_PER_HOUR = 150;
export const TRAVEL_COST_PER_HOUR = 50;
/** Marginalnivå som motbudet siktar på (grön nivå). */
export const TARGET_MARGIN_PCT = 18;

export interface CalcInput {
  offered_rate: number;
  compensation_type: CompensationType;
  housing_included: boolean;
  travel_included: boolean;
  benchmark_rate: number;
}

export interface CalcResult {
  normalized_rate: number;
  normalization_note: string;
  cost_adjustment: number;
  margin_pct: number;
  margin_pct_display: number;
  tier: MarginTier;
  counter_target_rate: number;
  counter_target_rate_user_terms: number;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function ceilTo5(value: number): number {
  return Math.ceil(value / 5) * 5;
}

export function tierFromMargin(marginPct: number): MarginTier {
  if (marginPct < 20) return "green";
  if (marginPct <= 30) return "yellow";
  return "red";
}

export function calculate(input: CalcInput): CalcResult {
  const { offered_rate, compensation_type, housing_included, travel_included, benchmark_rate } =
    input;

  let normalized_rate = offered_rate;
  let normalization_note = "Erbjuden ersättning används som fakturavärde per timme.";

  if (compensation_type === "Anställd") {
    normalized_rate = Math.round(offered_rate * EMPLOYED_TO_INVOICE_FACTOR * 10) / 10;
    normalization_note =
      `Anställningsvillkor: timlönen räknas upp med faktor ${EMPLOYED_TO_INVOICE_FACTOR} ` +
      "som schablon för arbetsgivaravgift, semester och pension.";
  } else if (compensation_type === "Okänt") {
    normalization_note =
      "Ersättningsformen framgår inte av underlaget. Beräkningen antar fakturering " +
      "och kan behöva justeras om det gäller anställning.";
  }

  const cost_adjustment =
    (housing_included ? HOUSING_COST_PER_HOUR : 0) + (travel_included ? TRAVEL_COST_PER_HOUR : 0);

  const totalCost = normalized_rate + cost_adjustment;
  const margin_pct = round1(((benchmark_rate - totalCost) / benchmark_rate) * 100);

  const targetTotal = benchmark_rate * (1 - TARGET_MARGIN_PCT / 100);
  const counter_target_rate = Math.max(normalized_rate, ceilTo5(targetTotal - cost_adjustment));

  const counter_target_rate_user_terms =
    compensation_type === "Anställd"
      ? ceilTo5(counter_target_rate / EMPLOYED_TO_INVOICE_FACTOR)
      : counter_target_rate;

  return {
    normalized_rate,
    normalization_note,
    cost_adjustment,
    margin_pct,
    margin_pct_display: Math.max(0, margin_pct),
    tier: tierFromMargin(margin_pct),
    counter_target_rate,
    counter_target_rate_user_terms,
  };
}
