/**
 * useCatalogZoneRates — hämtar zonpriser för en yrkeskategori direkt ur
 * `contract_version_rates` (SKR-katalogen är källa till sanning).
 *
 * Hämtningen delas med övriga prisytor via `fetchZoneRates` i @/lib/pricing —
 * en fetcher, en tolkning av zonrader.
 *
 * De hårdkodade värdena på rapportsidorna används enbart som fallback för
 * första render/offline, så att sidan aldrig visar tomma priser.
 */

import { useQuery } from "@tanstack/react-query";
import { fetchZoneRates, type ZoneRates } from "@/lib/pricing";

export type { ZoneRates };

export interface CatalogZoneRates extends ZoneRates {
  /** "db" = live ur katalogen, "fallback" = hårdkodat värde på sidan */
  source: "db" | "fallback";
}

export function useCatalogZoneRates(
  role: string,
  versionLabel: string,
  fallback: ZoneRates,
): CatalogZoneRates {
  const { data } = useQuery({
    queryKey: ["catalog-zone-rates", versionLabel, role],
    queryFn: () => fetchZoneRates(role, versionLabel),
    staleTime: 1000 * 60 * 60, // 1h
  });

  if (!data) return { ...fallback, source: "fallback" };
  return { ...data, source: "db" };
}
