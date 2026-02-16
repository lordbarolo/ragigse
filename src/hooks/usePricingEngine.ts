import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { EmploymentType } from "@/lib/calc";

export interface PricingResult {
  occupation: string;
  kommun: string;
  zon: string;
  region: string;
  employment_type: EmploymentType;
  rate_customer_sek_per_hour: number;
  consultant_share_min: number;
  consultant_share_max: number;
  employee_factor: number;
  hours_per_month: number;
  recommended_hourly_min: number;
  recommended_hourly_max: number;
  recommended_monthly_min: number;
  recommended_monthly_max: number;
}

export function usePricingEngine() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PricingResult | null>(null);

  const calculate = async (
    occupation: string,
    kommun: string,
    employment_type: EmploymentType
  ): Promise<PricingResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("pricing-engine", {
        body: { occupation, kommun, employment_type },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setResult(data as PricingResult);
      return data as PricingResult;
    } catch (e: any) {
      const msg = e?.message || "Calculation failed";
      setError(msg);
      setResult(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { calculate, result, loading, error };
}
