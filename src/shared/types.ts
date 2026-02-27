/**
 * Shared types used by both Teaser and Report pages.
 */

export interface ResultJson {
  calc_version: string;
  track?: "consultant" | "permanent";
  inputs: {
    location_id?: string;
    location?: string;
    occupation: string;
    employment_type: string;
    experience_years: number;
    current_salary_sek: number;
    salary_type?: string;
    sector?: string;
  };
  market?: {
    rate_customer_sek_per_hour?: number;
    source?: string;
    year?: number;
    region?: string;
    percentile_25?: number;
    percentile_50?: number;
    percentile_75?: number;
    average_monthly?: number;
  };
  recommendation?: {
    consultant_share_min: number;
    consultant_share_max: number;
    employee_factor: number;
    recommended_hourly_min: number;
    recommended_hourly_max: number;
    recommended_monthly_min: number;
    recommended_monthly_max: number;
    hours_per_month: number;
  };
  delta?: {
    monthly_vs_current_min: number;
    monthly_vs_current_max: number;
  };
  gap_analysis?: {
    current_salary: number;
    gap_vs_p75: number;
    gap_pct: number | null;
    category: "small" | "medium" | "large" | null;
  };
}

export interface ZoneComparison {
  yrkeskategori: string;
  zon: string;
  timpris_kund: number;
}

export interface ReportData {
  id: string;
  status: string;
  access: "full" | "preview";
  occupation: string;
  employment_type: string;
  kommun: string;
  experience: number;
  unlocked_by_referral: boolean;
  email?: string;
  result_json: ResultJson;
  zone_comparisons?: ZoneComparison[];
  user_zone?: string;
}

export interface BenchmarkMonthly {
  p25: number;
  p50: number;
  p75: number;
  gapPct: number;
  category?: "small" | "medium" | "large";
}
