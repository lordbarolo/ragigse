/**
 * useCatalogZoneRatesBatch — zonpriser för flera yrkeskategorier i ett anrop.
 *
 * Samma källa som `useCatalogZoneRates` (contract_version_rates), men för
 * tabell- och listsidor. Sidans egna värden används enbart som fallback för
 * första render/offline, så att en katalogändring alltid slår igenom.
 */

import { useQuery } from "@tanstack/react-query";
import { fetchZoneRatesBatch, type ZoneRates } from "@/lib/pricing";

export function useCatalogZoneRatesBatch(
  roles: string[],
  versionLabel: string,
): { get: (role: string, fallback: ZoneRates) => ZoneRates; source: "db" | "fallback" } {
  const key = [...roles].sort().join("|");
  const { data } = useQuery({
    queryKey: ["catalog-zone-rates-batch", versionLabel, key],
    queryFn: () => fetchZoneRatesBatch(roles, versionLabel),
    staleTime: 1000 * 60 * 60, // 1h
  });

  return {
    get: (role, fallback) => data?.[role] ?? fallback,
    source: data && Object.keys(data).length > 0 ? "db" : "fallback",
  };
}
