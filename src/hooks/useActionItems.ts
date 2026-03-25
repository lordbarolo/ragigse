import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ActionItem {
  id: string;
  profile_id: string;
  type: string;
  status: string;
  priority: number;
  created_at: string;
}

export function useActionItems(userId: string | undefined) {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("action_items")
      .select("*")
      .eq("profile_id", userId)
      .eq("status", "pending")
      .order("priority", { ascending: true });
    setActions((data as ActionItem[]) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { actions, loading, refresh };
}
