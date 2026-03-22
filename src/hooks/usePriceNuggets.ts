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

export function usePriceNuggets(category?: string) {
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
      setNuggets((data as unknown as PriceNugget[]) || []);
      setLoading(false);
    };
    fetch();
  }, [category]);

  return { nuggets, loading };
}
