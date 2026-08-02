/**
 * Gemensam query för startsidans priser.
 * Prefetchas i route-loadern (`ensureQueryData`) så att priserna finns i
 * det första HTML-svaret — inga skelett, inga "—" för agenter/crawlers.
 */
import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { basePrices, type RateRow } from "./rate5c";

export const ratesQueryOptions = {
  queryKey: ["rates"] as const,
  queryFn: async () => {
    const { data, error } = await supabase.from("rates").select("*");
    if (error) throw error;
    return data;
  },
  staleTime: 1000 * 60 * 60,
};

/** Grundpris-rader, server-renderade. */
export function useBaseRates5c(): RateRow[] {
  const { data } = useSuspenseQuery(ratesQueryOptions);
  return basePrices(data);
}
