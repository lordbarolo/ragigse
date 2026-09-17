export type BetaProfession = "Läkare" | "Sjuksköterska";
export type BetaCompensationType = "AB" | "Faktura" | "Anställd" | "Okänt";
export type BetaTier = "green" | "yellow" | "red";
export type BetaSeverity = "low" | "medium" | "high";

export interface BetaExtractedContract {
  profession: BetaProfession;
  specialty: string | null;
  region: string | null;
  compensation_type: BetaCompensationType;
  offered_rate: number | null;
  housing_included: boolean;
  travel_included: boolean;
  ob_specified: boolean;
  masked_summary: string;
  confidence: number;
}

export interface BetaRisk {
  title: string;
  detail: string;
  severity: BetaSeverity;
}

export interface BetaAnalysisResult {
  analysis_id: string | null;
  requested_tone: "soft" | "sharp";
  extracted: BetaExtractedContract & { offered_rate: number };
  zone: number;
  zone_assumed: boolean;
  benchmark: {
    rate: number;
    specialty: string | null;
    source: string | null;
    match_quality: string;
    assumed: boolean;
  };
  calc: {
    normalized_rate: number;
    normalization_note: string;
    cost_adjustment: number;
    margin_pct: number;
    margin_pct_display: number;
    tier: BetaTier;
    counter_target_rate: number;
    counter_target_rate_user_terms: number;
  };
  counter_offers: { soft: string; sharp: string };
  flagged_issues: BetaRisk[];
}

export interface BetaManualOverride {
  profession: BetaProfession;
  specialty: string;
  region: string;
  compensation_type: BetaCompensationType;
  offered_rate: number;
}

export interface BetaAnalysisInput {
  text?: string;
  file_base64?: string;
  mime_type?: string;
  tone?: "soft" | "sharp";
  manual_override?: BetaManualOverride;
}

export interface BetaApiErrorBody {
  error?: string;
  extracted?: Partial<BetaExtractedContract>;
}
