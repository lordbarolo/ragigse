/**
 * useCatalogZoneRates — hämtar zonpriser för en yrkeskategori direkt ur
 * `contract_version_rates` (SKR-katalogen är källa till sanning).
 *
 * De hårdkodade värdena på rapportsidorna används enbart som fallback för
 * första render/offline, så att sidan aldrig visar tomma priser. När DB
 * uppdateras (ny ramavtalsversion eller zonjustering) slår ändringen igenom
 * automatiskt utan kodändring.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ZoneRates {
  zone1: number;
  zone2: number;
  zone3: number;
}

export interface CatalogZoneRates extends ZoneRates {
  /** "db" = live ur katalogen, "fallback" = hårdkodat värde på sidan */
  source: "db" | "fallback";
}

async function fetchZoneRates(
  role: string,
  versionLabel: string,
): Promise<ZoneRates | null> {
  const { data, error } = await supabase
    .from("contract_version_rates")
    .select("yrkeskategori, zon, timpris_kund, contract_versions!inner(version_label)")
    .ilike("yrkeskategori", role)
    .eq("typ", "Grundpris")
    .eq("contract_versions.version_label", versionLabel);

  if (error || !data || data.length === 0) return null;

  const byZone: Record<string, number> = {};
  for (const row of data as unknown as { zon: string; timpris_kund: number }[]) {
    byZone[row.zon] = row.timpris_kund;
  }
  const zone1 = byZone["Zon 1"];
  const zone2 = byZone["Zon 2"];
  const zone3 = byZone["Zon 3"];
  if (zone1 == null || zone2 == null || zone3 == null) return null;

  return { zone1, zone2, zone3 };
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
