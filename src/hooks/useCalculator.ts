import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateSalaryRange, type EmploymentType } from "@/lib/calc";

// Re-export shared types/functions so existing imports keep working
export type { EmploymentType } from "@/lib/calc";
export { calculateSalaryRange };

/** @deprecated Use calculateSalaryRange instead — returns {hourly_min, hourly_max}. */
export function calculateResult(
  timpris_kund: number,
  employmentType: EmploymentType
): { low: number; high: number } {
  const r = calculateSalaryRange(timpris_kund, employmentType);
  return { low: r.hourly_min, high: r.hourly_max };
}

export interface CalculationResult {
  yrkeskategori: string;
  detaljer: string | null;
  timpris_kund: number;
  zon: string;
  kommun: string;
  region: string;
  employmentType: EmploymentType;
  bruttolon_low?: number;
  bruttolon_high?: number;
  ersattning_low?: number;
  ersattning_high?: number;
}

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

export function findClosestRate(
  rates: { yrkeskategori: string; zon: string; typ: string; timpris_kund: number; detaljer: string | null }[],
  zon: string,
  typ: string
) {
  return rates.filter((r) => r.zon === zon && r.typ === typ);
}
