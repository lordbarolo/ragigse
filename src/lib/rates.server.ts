/**
 * Server-only prislager. Marginalmodellen (@/lib/calc) importeras ENDAST här —
 * filnamnet *.server.ts blockeras från klientbundlen, så konstanterna
 * (0.80/0.85/0.90/1.38) kan aldrig läsas i devtools.
 *
 * Kundpris (SKR:s ramavtal) är offentlig data. Ersättning (företagare/löntagare)
 * beräknas här och returneras bara till inloggade anrop.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getMarginShares, EMPLOYER_FACTOR } from "@/lib/calc";

const GROUP_LABEL = /\bgrupp\s*[a-zA-Z0-9]+\b/i;

export interface CompRate {
  foretagareKrH: number;
  lontagareKrH: number;
  margin_text: string;
}

/** Publikt läsbar klient (anon-nivå, RLS gäller). */
export function publicClient() {
  return createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

/** Måste ge exakt samma resultat som public.cc_slugify i databasen. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[åäàáâ]/g, "a")
    .replace(/[öóô]/g, "o")
    .replace(/[éèêë]/g, "e")
    .replace(/[üúù]/g, "u")
    .replace(/[íì]/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Ersättning ur ett kundpris. Körs aldrig i klienten. */
export function compFromClientRate(role: string, clientRate: number): CompRate {
  const { share_min, share_max, margin_text } = getMarginShares(role);
  const shareMid = (share_min + share_max) / 2;
  const foretagareKrH = Math.round(clientRate * shareMid);
  return {
    foretagareKrH,
    lontagareKrH: Math.round(foretagareKrH / EMPLOYER_FACTOR),
    margin_text,
  };
}

/** Grundpris (kundpris) för en roll + zon ur tabellen `rates`. */
export async function baseClientRate(role: string, zone: string): Promise<number | null> {
  const { data, error } = await publicClient()
    .from("rates")
    .select("timpris_kund")
    .eq("yrkeskategori", role)
    .eq("zon", zone)
    .eq("typ", "Grundpris")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return typeof data?.timpris_kund === "number" ? data.timpris_kund : null;
}

export interface PublicLonRate {
  found: true;
  specialty_name: string;
  location_name: string;
  client_rate: number;
  source: string;
}

interface LookupRow {
  specialty_name: string;
  location_name: string;
  client_rate: number;
  contractor_rate: number;
  employee_rate: number;
  source: string;
}

/** RPC-uppslag via lookup_rate. Anropas bara server-side (EXECUTE saknas för anon). */
async function lookupRow(specialty: string, city: string): Promise<LookupRow | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("lookup_rate", {
    specialty_slug: slugify(specialty),
    location_slug: slugify(city),
  });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as LookupRow | undefined;
  if (!row || GROUP_LABEL.test(String(row.specialty_name ?? ""))) return null;
  return row;
}

/** Publik variant — kundpris + källa, ALDRIG contractor_rate/employee_rate. */
export async function lookupPublicRate(
  specialty: string,
  city: string,
): Promise<PublicLonRate | { found: false }> {
  const row = await lookupRow(specialty, city);
  if (!row) return { found: false };
  return {
    found: true,
    specialty_name: row.specialty_name,
    location_name: row.location_name,
    client_rate: row.client_rate,
    source: row.source,
  };
}

/** Inloggad variant — ersättningsnivåerna. */
export async function lookupCompRate(
  specialty: string,
  city: string,
): Promise<CompRate | null> {
  const row = await lookupRow(specialty, city);
  if (!row) return null;
  return {
    foretagareKrH: row.contractor_rate,
    lontagareKrH: row.employee_rate,
    margin_text: getMarginShares(row.specialty_name).margin_text,
  };
}

export interface LonOptions {
  roles: { name: string; slug: string }[];
  cities: { name: string; region: string; slug: string }[];
}

/** Giltiga roller + orter för fallback-sökrutan. Endast publika namn. */
export async function lonOptions(): Promise<LonOptions> {
  const supabase = publicClient();
  const [rolesRes, locRes] = await Promise.all([
    supabase
      .from("contract_version_rates")
      .select("yrkeskategori, contract_versions!inner(is_active)")
      .eq("contract_versions.is_active", true),
    supabase.from("locations").select("kommun, region"),
  ]);
  if (rolesRes.error) throw rolesRes.error;
  if (locRes.error) throw locRes.error;

  const roles = Array.from(
    new Set(
      (rolesRes.data ?? [])
        .map((r) => r.yrkeskategori as string)
        .filter((r) => r && !GROUP_LABEL.test(r) && !/^OB-tillägg/i.test(r)),
    ),
  )
    .sort((a, b) => a.localeCompare(b, "sv"))
    .map((name) => ({ name, slug: slugify(name) }));

  const cities = (locRes.data ?? [])
    .map((l) => ({
      name: l.kommun as string,
      region: l.region as string,
      slug: slugify(l.kommun as string),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));

  return { roles, cities };
}
