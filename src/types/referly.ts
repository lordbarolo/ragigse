import type { Tables, Enums } from "@/integrations/supabase/types";

// Type aliases for ref_* tables
export type RefProfile = Tables<"ref_profiles">;
export type RefReference = Tables<"ref_references">;
export type RefPing = Tables<"ref_pings">;
export type RefVerification = Tables<"ref_verifications">;
export type RefProfileView = Tables<"ref_profile_views">;
export type RefRoleProfile = Tables<"ref_role_profiles">;
export type RefUserRole = Tables<"ref_user_roles">;

export type RefReferenceStatus = Enums<"ref_reference_status">;
export type RefPingStatus = Enums<"ref_ping_status">;
export type RefAppRole = Enums<"ref_app_role">;

export const COMPETENCIES = [
  "Klinisk bedömning",
  "Journalföring",
  "Kommunikation med patienter",
  "Samarbete i team",
  "Akut omhändertagande",
  "Ledarskap",
  "Forskning och utveckling",
  "Undervisning och handledning",
] as const;

export const RELATIONSHIPS = [
  "Chef",
  "Kollega",
  "Handledare",
  "Annan",
] as const;

export interface ScoreBreakdown {
  role: { earned: number; max: number; chiefs: number; colleagues: number };
  domain: { earned: number; max: number; verified_count: number };
  recency: { earned: number; max: number; freshest_months: number; role_profile: string };
  ping: { earned: number; max: number; has_active_ping: boolean };
  compliance: { earned: number; max: number };
}

export interface TrustScoreResult {
  total: number;
  tier: string;
  breakdown: ScoreBreakdown;
}

export interface ProfileStatusResult {
  status: "complete" | "almost" | "incomplete";
  checklist: {
    references: { done: boolean; count: number; required: number; details?: Array<{ id: string; months_ago: number; is_fresh: boolean; is_warning: boolean; is_expired: boolean }> };
    bankid: { done: boolean };
    ivo: { done: boolean; validUntil?: string };
    hosp: { done: boolean; validUntil?: string };
  };
  effective_role: string;
  role_label: string;
  gold_months: number;
  warn_months: number;
}
