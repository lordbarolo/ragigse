import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { VaultData, VaultReference } from "@/types/referly";

export function useVault(userId: string | undefined) {
  const [data, setData] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("reference-vault", {
        body: { action: "get-vault" },
      });
      if (error) throw error;
      setData(result as VaultData);
    } catch (err) {
      console.error("[Vault] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const attach = useCallback(async (applicationId: string, referenceIds: string[]) => {
    if (!userId) throw new Error("Not authenticated");
    const { data: result, error } = await supabase.functions.invoke("reference-vault", {
      body: { action: "attach", application_id: applicationId, reference_ids: referenceIds },
    });
    if (error) throw error;
    return result;
  }, [userId]);

  return { data, loading, refresh, attach };
}
