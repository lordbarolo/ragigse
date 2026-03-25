import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BenchmarkResult {
  occupation: string;
  sector: string;
  region: string | null;
  year: number;
  source: string;
  percentile_25: number;
  percentile_50: number;
  percentile_75: number;
  current_salary?: number;
  gap_vs_p75?: number;
  gap_pct?: number;
  category?: "small" | "medium" | "large";
}

export function useBenchmarkEngine() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BenchmarkResult | null>(null);

  const calculate = async (
    occupation: string,
    sector: string,
    current_salary?: number
  ): Promise<BenchmarkResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("salary-benchmark-engine", {
        body: { occupation, sector, current_salary },
      });

      // Treat all benchmark errors as non-critical — data is supplementary
      if (fnError || data?.error) {
        setResult(null);
        setError(null);
        return null;
      }

      setResult(data as BenchmarkResult);
      return data as BenchmarkResult;
    } catch (e: any) {
      const msg = e?.message || "Benchmark calculation failed";
      setError(msg);
      setResult(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { calculate, result, loading, error };
}
