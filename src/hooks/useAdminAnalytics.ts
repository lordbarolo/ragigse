import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DayEntry {
  date: string;
  events: Record<string, number>;
}

export interface AdminAnalyticsData {
  timeSeries: DayEntry[];
  funnels: Record<string, Array<{ step: string; count: number; rate: number }>>;
  conversionRates: Record<string, { sessions: number; conversions: number; rate: string }>;
  totalEvents: number;
}

export function useAdminAnalytics(period: number) {
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - period);

      const { data: res, error } = await supabase.functions.invoke("analytics-dashboard", {
        body: { from: fromDate.toISOString().slice(0, 10) },
      });

      if (error) throw error;
      setData(res as AdminAnalyticsData);
    } catch (err: any) {
      console.error("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, refetch: fetchData };
}
