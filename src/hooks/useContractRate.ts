/**
 * useContractRate — single lookup hook for SKR 2026 nurse prices.
 *
 * Primary source: contract_version_rates v1.7 (DB).
 * Fallback: typed lookup in src/data/skrPrices2026.ts (PRICE_BY_ROLE).
 *
 * If the role does not resolve to an exact price row, status === "missing".
 * Callers MUST render a "Pris saknas — kontakta oss" surface in that case;
 * never substitute a generic specialist price.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  PRICE_BY_ROLE,
  lookupRolePrice,
  type PriceGroup,
  type RolePrice,
} from "@/data/skrPrices2026";

export type ContractRateResult =
  | {
      status: "ok";
      role: string;
      group: PriceGroup;
      zone1: number;
      zone2: number;
      zone3: number;
      source: "db" | "fallback";
    }
  | { status: "missing"; role: string | null }
  | { status: "loading" };

interface DbRateRow {
  yrkeskategori: string;
  zon: string;
  timpris_kund: number;
}

async function fetchDbRate(role: string): Promise<RolePrice | null> {
  const { data, error } = await supabase
    .from("contract_version_rates")
    .select("yrkeskategori, zon, timpris_kund, contract_versions!inner(version_label)")
    .eq("yrkeskategori", role)
    .eq("typ", "Grundpris")
    .eq("contract_versions.version_label", "v1.7");

  if (error || !data || data.length === 0) return null;

  const byZone: Record<string, number> = {};
  for (const row of data as unknown as DbRateRow[]) {
    byZone[row.zon] = row.timpris_kund;
  }
  const z1 = byZone["Zon 1"];
  const z2 = byZone["Zon 2"];
  const z3 = byZone["Zon 3"];
  if (z1 == null || z2 == null || z3 == null) return null;

  const fallback = PRICE_BY_ROLE[role];
  return {
    role,
    group: fallback?.group ?? deriveGroup(z1),
    zone1: z1,
    zone2: z2,
    zone3: z3,
    contractVersion: "v1.7",
  };
}

function deriveGroup(zone1: number): PriceGroup {
  if (zone1 >= 740) return "hog";
  if (zone1 >= 687) return "mellan";
  return "bas";
}

export function useContractRate(role: string | null | undefined): ContractRateResult {
  const canonical = lookupRolePrice(role)?.role ?? null;

  const enabled = !!canonical;
  const { data, isLoading } = useQuery({
    queryKey: ["contract-rate-v1.7", canonical],
    queryFn: async () => {
      if (!canonical) return null;
      return (await fetchDbRate(canonical)) ?? PRICE_BY_ROLE[canonical] ?? null;
    },
    enabled,
    staleTime: 1000 * 60 * 60, // 1h
  });

  if (!canonical) return { status: "missing", role: role ?? null };
  if (isLoading) return { status: "loading" };
  if (!data) {
    // DB miss + TS miss → treat as missing rather than guessing.
    const ts = PRICE_BY_ROLE[canonical];
    if (!ts) return { status: "missing", role: canonical };
    return {
      status: "ok",
      role: canonical,
      group: ts.group,
      zone1: ts.zone1,
      zone2: ts.zone2,
      zone3: ts.zone3,
      source: "fallback",
    };
  }
  return {
    status: "ok",
    role: canonical,
    group: data.group,
    zone1: data.zone1,
    zone2: data.zone2,
    zone3: data.zone3,
    source: "db",
  };
}
