/**
 * Server functions för prisdata.
 *
 * Publika fn:er returnerar ENBART kundpris (offentlig ramavtalsdata).
 * Ersättningsnivåerna kräver inloggning via requireSupabaseAuth — ingen ny
 * publik endpoint, ingen edge-funktion med verify_jwt = false.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slugPair = z.object({
  specialty: z.string().min(1).max(120),
  city: z.string().min(1).max(120),
});

const roleZone = z.object({
  role: z.string().min(1).max(160),
  zone: z.string().min(1).max(40),
});

const roleZoneList = z.object({
  items: z.array(roleZone).min(1).max(60),
});

/** Publikt: kundpris + källa för /lon/[roll]/[ort]. */
export const getPublicLonRate = createServerFn({ method: "GET" })
  .inputValidator((d) => slugPair.parse(d))
  .handler(async ({ data }) => {
    const { lookupPublicRate } = await import("./rates.server");
    return lookupPublicRate(data.specialty, data.city);
  });

/** Publikt: valbara roller och orter. */
export const getLonOptions = createServerFn({ method: "GET" }).handler(async () => {
  const { lonOptions } = await import("./rates.server");
  return lonOptions();
});

/** Inloggat: ersättning som företagare/löntagare för /lon-sidan. */
export const getLonCompRate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => slugPair.parse(d))
  .handler(async ({ data }) => {
    const { lookupCompRate } = await import("./rates.server");
    return lookupCompRate(data.specialty, data.city);
  });

/** Inloggat: ersättning för en roll + zon (rateräknaren på startsidan). */
export const getZoneCompRate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => roleZone.parse(d))
  .handler(async ({ data }) => {
    const { baseClientRate, compFromClientRate } = await import("./rates.server");
    const clientRate = await baseClientRate(data.role, data.zone);
    if (clientRate == null) return null;
    return compFromClientRate(data.role, clientRate);
  });

/** Inloggat: ersättning för flera roll/zon-kombinationer (rolltabellen). */
export const getZoneCompRates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => roleZoneList.parse(d))
  .handler(async ({ data }) => {
    const { baseClientRate, compFromClientRate } = await import("./rates.server");
    const out: Record<string, number | null> = {};
    for (const item of data.items) {
      const clientRate = await baseClientRate(item.role, item.zone);
      out[`${item.role}|${item.zone}`] =
        clientRate == null ? null : compFromClientRate(item.role, clientRate).foretagareKrH;
    }
    return out;
  });
