import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type { EmploymentType } from "@/lib/calc";
export { calculateSalaryRange } from "@/lib/calc";

export function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("kommun");
      if (error) throw error;
      return data;
    },
  });
}

export function useRates() {
  return useQuery({
    queryKey: ["rates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rates").select("*");
      if (error) throw error;
      return data;
    },
  });
}
