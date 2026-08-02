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
  const { data } = await supabase
    .from("consultant_profiles")
    .select("specialty_id, region_id, employment_type, current_hourly_rate")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;

  let role: string | null = null;
  let kommun: string | null = null;

  if (data.specialty_id) {
    const { data: spec } = await supabase
      .from("specialties")
      .select("name")
      .eq("id", data.specialty_id)
      .maybeSingle();
    role = spec?.name ?? null;
  }
  if (data.region_id) {
    const { data: reg } = await supabase
      .from("regions")
      .select("kommun")
      .eq("id", data.region_id)
      .maybeSingle();
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
export async function saveProfileContext(userId: string, input: SaveProfileContextInput) {
  let specialtyId: string | null = null;
  let regionId: string | null = null;

  if (input.role) {
    const { data: spec } = await supabase
      .from("specialties")
      .select("id")
      .ilike("name", input.role)
      .limit(1)
      .maybeSingle();
    specialtyId = spec?.id ?? null;
  }
  if (input.kommun) {
    const { data: reg } = await supabase
      .from("regions")
      .select("id")
      .ilike("kommun", input.kommun)
      .limit(1)
      .maybeSingle();
    regionId = reg?.id ?? null;
  }

  const { error } = await supabase.from("consultant_profiles").upsert(
    {
      user_id: userId,
      specialty_id: specialtyId,
      region_id: regionId,
      employment_type: input.employmentType,
      salary_type: "hourly",
      current_hourly_rate: input.hourlyRate,
      onboarding_step: 5,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}
