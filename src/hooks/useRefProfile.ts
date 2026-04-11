import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RefReference, TrustScoreResult, ProfileStatusResult } from "@/types/referly";

export function useRefProfile(userId: string | undefined) {
  const [references, setReferences] = useState<RefReference[]>([]);
  const [trustScore, setTrustScore] = useState<TrustScoreResult | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasRefProfile, setHasRefProfile] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    // Check/create ref_profile
    const { data: existing } = await supabase
      .from("ref_profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!existing) {
      // Get user email
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        await supabase.from("ref_profiles").insert({
          id: userId,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email.split("@")[0],
        });
      }
    }
    setHasRefProfile(true);

    // Fetch all data in parallel
    const [refsResult, scoreResult, statusResult] = await Promise.all([
      supabase
        .from("ref_references_safe" as any)
        .select("*")
        .eq("individual_id", userId)
        .order("created_at", { ascending: false }),
      supabase.rpc("ref_calculate_trust_score", { p_profile_id: userId }),
      supabase.rpc("ref_calculate_profile_status", { p_profile_id: userId }),
    ]);

    setReferences(refsResult.data || []);
    if (scoreResult.data) setTrustScore(scoreResult.data as unknown as TrustScoreResult);
    if (statusResult.data) setProfileStatus(statusResult.data as unknown as ProfileStatusResult);

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { references, trustScore, profileStatus, loading, hasRefProfile, refresh };
}
