import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PriceNugget {
  id: string;
  category: string;
  title: string;
  description: string;
  change_type: string;
  effective_from: string | null;
  priority: number;
  metadata: Record<string, any> | null;
}

export function usePriceNuggets(category?: string, zon?: string) {
  const [nuggets, setNuggets] = useState<PriceNugget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      let q = supabase
        .from("price_nuggets" as any)
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: false });

      if (category) {
        q = q.or(`category.eq.${category},category.eq.allmän`);
      }

      const { data } = await q;
      let items = (data as unknown as PriceNugget[]) || [];

      // If zon is provided, prefer nuggets matching that zone but keep
      // nuggets without a zone set (null) as general fallback.
      if (zon && items.length > 0) {
        const zonLower = zon.toLowerCase();
        const matched = items.filter((n) => {
          const nuggetZon = (n.metadata as Record<string, any> | null)?.zon;
          return !nuggetZon || nuggetZon.toLowerCase() === zonLower;
        });
        if (matched.length > 0) items = matched;
      }

      setNuggets(items);
      setLoading(false);
    };
    fetch();
  }, [category, zon]);

  return { nuggets, loading };
}
