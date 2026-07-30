import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AiQuotaStatus {
  used: number;
  limit: number | null;
  remaining: number;
  resetsAt: string | null;
  isAdmin: boolean;
  loading: boolean;
}

/**
 * Reads the current user's daily AI quota from public.check_ai_rate_limit.
 * Refreshes on demand (call refresh()) — typically after an AI request completes.
 */
export function useAiQuota() {
  const { user } = useAuth();
  const [status, setStatus] = useState<AiQuotaStatus>({
    used: 0,
    limit: 30,
    remaining: 30,
    resetsAt: null,
    isAdmin: false,
    loading: true,
  });

  const refresh = useCallback(async () => {
    if (!user) {
      setStatus((s) => ({ ...s, loading: false }));
      return;
    }
    const { data, error } = await supabase.rpc("check_ai_rate_limit", {
      _user_id: user.id,
      _daily_limit: 30,
    });
    if (error || !data) {
      setStatus((s) => ({ ...s, loading: false }));
      return;
    }
    const d = data as Record<string, unknown>;
    setStatus({
      used: Number(d.used ?? 0),
      limit: d.limit == null ? null : Number(d.limit),
      remaining: Number(d.remaining ?? 0),
      resetsAt: (d.resets_at as string) ?? null,
      isAdmin: Boolean(d.is_admin),
      loading: false,
    });
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...status, refresh };
}
