import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EmploymentType = "anstalld" | "foretagare";

export interface CalculationResult {
  yrkeskategori: string;
  detaljer: string | null;
  timpris_kund: number;
  zon: string;
  kommun: string;
  region: string;
  employmentType: EmploymentType;
  // Anställd
  bruttolon_low?: number;
  bruttolon_high?: number;
  // Företagare
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

export function calculateResult(
  timpris_kund: number,
  employmentType: EmploymentType
): { low: number; high: number } {
  if (employmentType === "foretagare") {
    return {
      low: Math.round(timpris_kund * 0.85),
      high: Math.round(timpris_kund * 0.90),
    };
  }
  // Anställd: 85-90% av priset (10-15% marginal), dela med 1.42
  const loneutrymmeLow = timpris_kund * 0.85;
  const loneutrymmeHigh = timpris_kund * 0.90;
  return {
    low: Math.round(loneutrymmeLow / 1.42),
    high: Math.round(loneutrymmeHigh / 1.42),
  };
}

export function findClosestRate(
  rates: { yrkeskategori: string; zon: string; typ: string; timpris_kund: number; detaljer: string | null }[],
  zon: string,
  typ: string
) {
  // Find all rates matching zone and type
  return rates.filter((r) => r.zon === zon && r.typ === typ);
}
