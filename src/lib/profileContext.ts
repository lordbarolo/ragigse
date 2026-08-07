import { supabase } from "@/integrations/supabase/client";

/**
 * Profilkontext = roll, ort, kontraktsform och ersättning.
 * Sparas i consultant_profiles och används både för onboarding-gaten och som
 * kontext (RAG) till den inloggade fritextchatten.
 */
export interface ProfileContext {
  role: string | null;
  kommun: string | null;
  employmentType: string | null;
  hourlyRate: number | null;
}

export function isProfileComplete(ctx: ProfileContext | null): boolean {
  if (!ctx) return false;
  return !!ctx.role && !!ctx.kommun && !!ctx.employmentType && !!ctx.hourlyRate;
}

export async function fetchProfileContext(userId: string): Promise<ProfileContext | null> {
  const { data, error } = await supabase
    .from("consultant_profiles")
    .select("role_name, kommun_name, specialty_id, region_id, employment_type, current_hourly_rate")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) return null;

  let role: string | null = data.role_name;
  let kommun: string | null = data.kommun_name;

  if (!role && data.specialty_id) {
    const { data: spec, error: specialtyError } = await supabase
      .from("specialties")
      .select("name")
      .eq("id", data.specialty_id)
      .maybeSingle();
    if (specialtyError) throw specialtyError;
    role = spec?.name ?? null;
  }
  if (!kommun && data.region_id) {
    const { data: reg, error: regionError } = await supabase
      .from("regions")
      .select("kommun")
      .eq("id", data.region_id)
      .maybeSingle();
    if (regionError) throw regionError;
    kommun = reg?.kommun ?? null;
  }

  return {
    role,
    kommun,
    employmentType: data.employment_type ?? null,
    hourlyRate: data.current_hourly_rate ?? null,
  };
}

export interface SaveProfileContextInput {
  role: string;
  kommun: string;
  employmentType: string;
  hourlyRate: number;
}

/** Sparar enkätens svar på användarens profil. */
export async function saveProfileContext(userId: string, input: SaveProfileContextInput): Promise<ProfileContext> {
  const { data, error } = await supabase.from("consultant_profiles").upsert(
    {
      user_id: userId,
      role_name: input.role,
      kommun_name: input.kommun,
      employment_type: input.employmentType,
      salary_type: "hourly",
      current_hourly_rate: input.hourlyRate,
      onboarding_step: 5,
    },
    { onConflict: "user_id" },
  ).select("role_name, kommun_name, employment_type, current_hourly_rate").single();
  if (error) throw error;

  const saved = {
    role: data.role_name,
    kommun: data.kommun_name,
    employmentType: data.employment_type,
    hourlyRate: data.current_hourly_rate,
  };
  if (!isProfileComplete(saved)) {
    throw new Error("Profilen kunde inte verifieras efter sparning.");
  }
  return saved;
}
