/**
 * Klienthook för ersättningsnivåer på startsidan.
 * Siffrorna räknas fram server-side (src/lib/rates.server.ts) och hämtas bara
 * när besökaren är inloggad. Utloggad → alltid null, inget anrop.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getZoneCompRate, getZoneCompRates } from "@/lib/rates.functions";
import { useAuth } from "@/hooks/useAuth";
import type { Comp5c } from "./rate5c";

export function useIsSignedIn(): boolean {
  const { user } = useAuth();
  return !!user;
}

export function useComp5c(role: string, zone: string): Comp5c | null {
  const signedIn = useIsSignedIn();
  const fetchComp = useServerFn(getZoneCompRate);
  const { data } = useQuery({
    queryKey: ["comp5c", role, zone],
    queryFn: () => fetchComp({ data: { role, zone } }),
    enabled: signedIn && !!role && !!zone,
    staleTime: 1000 * 60 * 60,
  });
  return (data as Comp5c | null) ?? null;
}

export function useCompMap5c(items: { role: string; zone: string }[]): Record<string, number | null> {
  const signedIn = useIsSignedIn();
  const fetchComps = useServerFn(getZoneCompRates);
  const key = items.map((i) => `${i.role}|${i.zone}`).join(",");
  const { data } = useQuery({
    queryKey: ["comp5c-map", key],
    queryFn: () => fetchComps({ data: { items } }),
    enabled: signedIn && items.length > 0,
    staleTime: 1000 * 60 * 60,
  });
  return (data as Record<string, number | null>) ?? {};
}
