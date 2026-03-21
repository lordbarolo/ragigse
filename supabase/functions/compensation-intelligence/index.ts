import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  calculateSalaryRange,
  type EmploymentType,
  type MarginModel,
} from "../_shared/calc.ts";

// ── CORS ─────────────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Standardized Types ──────────────────────────────────────────────────────

interface CIError {
  code: string;
  message: string;
}

interface CISource {
  name: string;
  version: string;
  confidence: string;
}

interface CIPolicy {
  status: "allowed" | "fallback" | "blocked";
  client_type: string;
  fallback_applied: boolean;
  fallback_level: string | null;
}

interface CIResponseEnvelope {
  query_id: string | null;
  capability: string;
  status: "success" | "error";
  data: Record<string, unknown> | null;
  source: CISource | null;
  policy: CIPolicy;
  errors: CIError[];
}

interface PolicyRuleResult {
  pass: boolean;
  rule: string;
  reason?: string;
}

interface PolicyResult {
  status: "allowed" | "fallback" | "blocked";
  reason?: string;
  applied_rules: string[];
}

interface ResolvedRole {
  role_id: string;
  code: string;
  name: string;
  method: string;
  confidence: number;
}

interface ResolvedGeography {
  geo_id: string;
  name: string;
  type: string;
  zone_name: string | null;
  region_name: string | null;
  method: string;
  confidence: number;
}

interface ResolvedEntities {
  role?: ResolvedRole;
  geography?: ResolvedGeography;
}

interface CIRequest {
  capability: string;
  version?: number;
  params: Record<string, unknown>;
  client_type?: string;
}

interface ClientProfile {
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  max_entities_per_query: number;
  allowed_capabilities: string[];
  policy_rules: {
    sample_size_min: number;
    anti_enum_window_minutes: number;
    anti_enum_max_sequential: number;
  };
}

// ── Error Codes ──────────────────────────────────────────────────────────────

const ERROR_CODES: Record<string, { status: number; message: string }> = {
  ENTITY_NOT_RESOLVED: { status: 404, message: "Kunde inte matcha en eller flera entiteter (roll eller geografi)." },
  INSUFFICIENT_SAMPLE: { status: 422, message: "För få datapunkter för att visa benchmark på denna nivå." },
  QUERY_TOO_BROAD: { status: 400, message: "Frågan är för bred — ange roll och/eller geografi." },
  ENUMERATION_RISK: { status: 429, message: "För många sekventiella uppslag — vänta och försök igen." },
  RATE_LIMITED: { status: 429, message: "Rate limit nådd — vänta och försök igen." },
  CAPABILITY_NOT_ALLOWED: { status: 403, message: "Denna capability är inte tillåten för din klientprofil." },
  NO_DATA_FOUND: { status: 404, message: "Inga data hittades för angiven kombination." },
  INVALID_INPUT: { status: 400, message: "Ogiltig indata — kontrollera parametrarna." },
  INTERNAL_ERROR: { status: 500, message: "Internt serverfel." },
};

function makeError(code: string, overrideMessage?: string): CIError {
  const def = ERROR_CODES[code] ?? ERROR_CODES.INTERNAL_ERROR;
  return { code, message: overrideMessage ?? def.message };
}

function errorHttpStatus(code: string): number {
  return ERROR_CODES[code]?.status ?? 500;
}

// ── Helper: build envelope ───────────────────────────────────────────────────

function buildResponse(
  queryId: string | null,
  capability: string,
  data: Record<string, unknown> | null,
  source: CISource | null,
  policy: CIPolicy,
  errors: CIError[]
): CIResponseEnvelope {
  return {
    query_id: queryId,
    capability,
    status: errors.length > 0 ? "error" : "success",
    data: errors.length > 0 ? null : data,
    source: errors.length > 0 ? null : source,
    policy,
    errors,
  };
}

// ── Entity Resolver (normalized tables) ──────────────────────────────────────

async function resolveRole(
  supabase: ReturnType<typeof createClient>,
  rawRole: string
): Promise<ResolvedRole | null> {
  async function fetchRole(roleId: string): Promise<ResolvedRole | null> {
    const { data: role } = await supabase
      .from("roles")
      .select("id, code, name")
      .eq("id", roleId)
      .single();
    if (!role) return null;
    return { role_id: role.id, code: role.code, name: role.name, method: "", confidence: 0 };
  }

  // 1. Exact alias match
  const { data: exact } = await supabase
    .from("role_aliases")
    .select("role_id")
    .ilike("alias", rawRole)
    .limit(1)
    .maybeSingle();
  if (exact) {
    const role = await fetchRole(exact.role_id);
    if (role) return { ...role, method: "alias_exact", confidence: 1.0 };
  }

  // 2. Fuzzy alias match
  const { data: fuzzy } = await supabase
    .from("role_aliases")
    .select("role_id")
    .ilike("alias", `%${rawRole}%`)
    .limit(1)
    .maybeSingle();
  if (fuzzy) {
    const role = await fetchRole(fuzzy.role_id);
    if (role) return { ...role, method: "alias_fuzzy", confidence: 0.8 };
  }

  // 3. Stem match on roles.name
  const stem = rawRole.trim().toLowerCase().replace(/(orna|arna|erna|or|ar|er|a|e|n)$/u, "");
  if (stem.length >= 4) {
    const { data: stemMatch } = await supabase
      .from("roles")
      .select("id, code, name")
      .ilike("name", `%${stem}%`)
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    if (stemMatch) {
      return { role_id: stemMatch.id, code: stemMatch.code, name: stemMatch.name, method: "stem", confidence: 0.6 };
    }
  }

  return null;
}

async function resolveGeography(
  supabase: ReturnType<typeof createClient>,
  rawGeo: string
): Promise<ResolvedGeography | null> {
  async function fetchGeo(geoId: string, method: string, confidence: number): Promise<ResolvedGeography | null> {
    const { data: g } = await supabase
      .from("geographies")
      .select("id, name, type, code, parent_id")
      .eq("id", geoId)
      .single();
    if (!g) return null;
    const hierarchy = await resolveGeoHierarchy(supabase, g);
    return { geo_id: g.id, name: g.name, type: g.type, ...hierarchy, method, confidence };
  }

  // 1. Exact alias
  const { data: exact } = await supabase
    .from("geography_aliases")
    .select("geo_id")
    .ilike("alias", rawGeo)
    .limit(1)
    .maybeSingle();
  if (exact) {
    const geo = await fetchGeo(exact.geo_id, "alias_exact", 1.0);
    if (geo) return geo;
  }

  // 2. Fuzzy alias
  const { data: fuzzy } = await supabase
    .from("geography_aliases")
    .select("geo_id")
    .ilike("alias", `%${rawGeo}%`)
    .limit(1)
    .maybeSingle();
  if (fuzzy) {
    const geo = await fetchGeo(fuzzy.geo_id, "alias_fuzzy", 0.8);
    if (geo) return geo;
  }

  // 3. Direct geographies lookup
  const { data: direct } = await supabase
    .from("geographies")
    .select("id, name, type, code, parent_id")
    .ilike("name", rawGeo)
    .limit(1)
    .maybeSingle();
  if (direct) {
    const hierarchy = await resolveGeoHierarchy(supabase, direct);
    return { geo_id: direct.id, name: direct.name, type: direct.type, ...hierarchy, method: "geo_direct", confidence: 0.7 };
  }

  return null;
}

async function resolveGeoHierarchy(
  supabase: ReturnType<typeof createClient>,
  geo: { id: string; name: string; type: string; parent_id: string | null }
): Promise<{ zone_name: string | null; region_name: string | null }> {
  let zone_name: string | null = null;
  let region_name: string | null = null;

  if (geo.type === "zone") zone_name = geo.name;
  if (geo.type === "region") region_name = geo.name;

  let parentId = geo.parent_id;
  let depth = 0;
  while (parentId && depth < 5) {
    const { data: parent } = await supabase
      .from("geographies")
      .select("id, name, type, parent_id")
      .eq("id", parentId)
      .single();
    if (!parent) break;
    if (parent.type === "zone") zone_name = parent.name;
    if (parent.type === "region") region_name = parent.name;
    parentId = parent.parent_id;
    depth++;
  }

  if (geo.type === "municipality" && !zone_name) {
    const { data: loc } = await supabase
      .from("locations")
      .select("zon")
      .ilike("kommun", geo.name)
      .limit(1)
      .maybeSingle();
    if (loc) zone_name = loc.zon;
  }

  return { zone_name, region_name };
}

// ── Policy Layer ─────────────────────────────────────────────────────────────

async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  clientIp: string,
  profile: ClientProfile
): Promise<PolicyRuleResult> {
  const windowStart = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabase
    .from("compensation_queries")
    .select("id", { count: "exact", head: true })
    .eq("client_ip", clientIp)
    .gte("created_at", windowStart);

  if ((count ?? 0) >= profile.rate_limit_per_minute) {
    return { pass: false, rule: "rate_limit", reason: "RATE_LIMITED" };
  }
  return { pass: true, rule: "rate_limit" };
}

function checkCapabilityAccess(capability: string, profile: ClientProfile): PolicyRuleResult {
  if (!profile.allowed_capabilities.includes(capability)) {
    return { pass: false, rule: "capability_access", reason: "CAPABILITY_NOT_ALLOWED" };
  }
  return { pass: true, rule: "capability_access" };
}

function checkQueryBreadth(params: Record<string, unknown>, capability: string): PolicyRuleResult {
  if (capability === "lookup_rate" || capability === "compare_roles") {
    if (!params.role && !params.role_a) {
      return { pass: false, rule: "query_breadth", reason: "QUERY_TOO_BROAD" };
    }
    if (!params.geography) {
      return { pass: false, rule: "query_breadth", reason: "QUERY_TOO_BROAD" };
    }
  }
  if (capability === "salary_benchmark" || capability === "salary_position") {
    if (!params.role) {
      return { pass: false, rule: "query_breadth", reason: "QUERY_TOO_BROAD" };
    }
  }
  return { pass: true, rule: "query_breadth" };
}

async function checkAntiEnumeration(
  supabase: ReturnType<typeof createClient>,
  clientIp: string,
  capability: string,
  profile: ClientProfile
): Promise<PolicyRuleResult> {
  const windowStart = new Date(
    Date.now() - profile.policy_rules.anti_enum_window_minutes * 60_000
  ).toISOString();

  const { data: recentQueries } = await supabase
    .from("compensation_queries")
    .select("resolved_entities_json")
    .eq("client_ip", clientIp)
    .eq("capability_key", capability)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: false })
    .limit(profile.policy_rules.anti_enum_max_sequential + 1);

  if (!recentQueries || recentQueries.length < profile.policy_rules.anti_enum_max_sequential) {
    return { pass: true, rule: "anti_enumeration" };
  }

  const geos = new Set<string>();
  const roles = new Set<string>();
  for (const q of recentQueries) {
    const entities = q.resolved_entities_json as ResolvedEntities | null;
    if (entities?.geography) geos.add(entities.geography.geo_id);
    if (entities?.role) roles.add(entities.role.role_id);
  }

  if (geos.size <= 1 && roles.size >= profile.policy_rules.anti_enum_max_sequential) {
    return { pass: false, rule: "anti_enumeration", reason: "ENUMERATION_RISK" };
  }

  return { pass: true, rule: "anti_enumeration" };
}

async function evaluatePolicy(
  supabase: ReturnType<typeof createClient>,
  capability: string,
  params: Record<string, unknown>,
  clientIp: string,
  clientType: string
): Promise<{ result: PolicyResult; profile: ClientProfile }> {
  const { data: profileData } = await supabase
    .from("client_profiles")
    .select("*")
    .eq("profile_key", clientType)
    .limit(1)
    .maybeSingle();

  const profile: ClientProfile = profileData
    ? {
        rate_limit_per_minute: profileData.rate_limit_per_minute,
        rate_limit_per_day: profileData.rate_limit_per_day,
        max_entities_per_query: profileData.max_entities_per_query,
        allowed_capabilities: profileData.allowed_capabilities as string[],
        policy_rules: profileData.policy_rules as ClientProfile["policy_rules"],
      }
    : {
        rate_limit_per_minute: 15,
        rate_limit_per_day: 200,
        max_entities_per_query: 2,
        allowed_capabilities: ["lookup_rate", "salary_benchmark", "salary_position", "compare_roles"],
        policy_rules: { sample_size_min: 10, anti_enum_window_minutes: 10, anti_enum_max_sequential: 5 },
      };

  const rules: PolicyRuleResult[] = [];
  rules.push(checkCapabilityAccess(capability, profile));
  rules.push(checkQueryBreadth(params, capability));
  rules.push(await checkRateLimit(supabase, clientIp, profile));

  if (capability === "lookup_rate" || capability === "compare_roles") {
    rules.push(await checkAntiEnumeration(supabase, clientIp, capability, profile));
  }

  const failedRules = rules.filter((r) => !r.pass);
  const appliedRules = rules.map((r) => r.rule);

  if (failedRules.length > 0) {
    return {
      result: { status: "blocked", reason: failedRules[0].reason, applied_rules: appliedRules },
      profile,
    };
  }

  return { result: { status: "allowed", applied_rules: appliedRules }, profile };
}

// ── Capability Layer ─────────────────────────────────────────────────────────

const SOURCE_RATES: CISource = {
  name: "SKR ramavtal",
  version: "SKR 2026 v1.0",
  confidence: "high",
};

const SOURCE_BENCHMARKS: CISource = {
  name: "SCB/Medlingsinstitutet lönestatistik",
  version: "2025",
  confidence: "high",
};

async function capLookupRate(
  supabase: ReturnType<typeof createClient>,
  resolved: ResolvedEntities,
  params: Record<string, unknown>
): Promise<{ data: Record<string, unknown>; source: CISource; fallback_level: string | null }> {
  const geo = resolved.geography!;
  const role = resolved.role!;
  const empType = (params.employment_type as EmploymentType) || "anstalld";

  // Margin model
  const { data: modelData } = await supabase
    .from("margin_models")
    .select("share_min, share_max, employer_factor, hours_per_month")
    .eq("name", "default")
    .eq("is_active", true)
    .limit(1)
    .single();

  const FORETAGARE_SHARE_MIN = 0.85;
  const FORETAGARE_SHARE_MAX = 0.92;

  const baseModel: MarginModel | undefined = modelData
    ? { share_min: Number(modelData.share_min), share_max: Number(modelData.share_max), employer_factor: Number(modelData.employer_factor), hours_per_month: Number(modelData.hours_per_month) }
    : undefined;

  const effectiveModel: MarginModel = baseModel
    ? empType === "foretagare" ? { ...baseModel, share_min: FORETAGARE_SHARE_MIN, share_max: FORETAGARE_SHARE_MAX } : baseModel
    : empType === "foretagare"
      ? { share_min: FORETAGARE_SHARE_MIN, share_max: FORETAGARE_SHARE_MAX, employer_factor: 1.42, hours_per_month: 167 }
      : { share_min: 0.85, share_max: 0.90, employer_factor: 1.42, hours_per_month: 167 };

  // Rate lookup
  let timprisKund = 0;
  let matchedOccupation = role.name;
  let fallbackLevel: string | null = null;
  const zoneName = geo.zone_name;
  const rawRole = (params.role ?? params.role_a) as string | undefined;

  const namesToTry: string[] = [];
  if (rawRole) namesToTry.push(rawRole);
  if (role.code !== rawRole) namesToTry.push(role.code);
  if (role.name !== role.code && role.name !== rawRole) namesToTry.push(role.name);

  if (zoneName) {
    for (const candidate of namesToTry) {
      if (timprisKund > 0) break;
      const { data: rateData } = await supabase
        .from("rates").select("timpris_kund, yrkeskategori").eq("yrkeskategori", candidate).eq("zon", zoneName).limit(1);
      if (rateData?.length) { timprisKund = rateData[0].timpris_kund; matchedOccupation = rateData[0].yrkeskategori; }
    }

    if (timprisKund === 0) {
      for (const candidate of namesToTry) {
        if (timprisKund > 0) break;
        const { data: ilikeRate } = await supabase
          .from("rates").select("timpris_kund, yrkeskategori").ilike("yrkeskategori", `%${candidate}%`).eq("zon", zoneName).limit(1);
        if (ilikeRate?.length) { timprisKund = ilikeRate[0].timpris_kund; matchedOccupation = ilikeRate[0].yrkeskategori; fallbackLevel = "ilike_match"; }
      }
    }

    if (timprisKund === 0) {
      for (const candidate of namesToTry) {
        if (timprisKund > 0) break;
        const { data: anyRate } = await supabase.from("rates").select("typ").eq("yrkeskategori", candidate).limit(1);
        if (anyRate?.length) {
          const { data: zoneRate } = await supabase.from("rates").select("timpris_kund").eq("typ", anyRate[0].typ).eq("zon", zoneName).limit(1);
          if (zoneRate?.length) { timprisKund = zoneRate[0].timpris_kund; fallbackLevel = "typ_zon"; }
        }
      }
    }
  }

  if (timprisKund === 0) throw new Error("NO_DATA_FOUND");

  const range = calculateSalaryRange(timprisKund, empType, effectiveModel);
  const factor = empType === "anstalld" ? effectiveModel.employer_factor : 1;

  return {
    data: {
      role: { id: role.role_id, code: role.code, name: matchedOccupation },
      geography: { id: geo.geo_id, name: geo.name, zone: geo.zone_name, region: geo.region_name },
      amount: timprisKund,
      currency: "SEK",
      unit: "per_hour",
      agreement_name: "SKR ramavtal",
      agreement_version: "SKR 2026 v1.0",
      effective_from: "2026-01-01",
      effective_to: null,
      employment_type: empType,
      consultant_share_min: effectiveModel.share_min,
      consultant_share_max: effectiveModel.share_max,
      employee_factor: factor,
      hours_per_month: effectiveModel.hours_per_month,
      recommended_hourly_min: range.hourly_min,
      recommended_hourly_max: range.hourly_max,
      recommended_monthly_min: range.monthly_min,
      recommended_monthly_max: range.monthly_max,
    },
    source: SOURCE_RATES,
    fallback_level: fallbackLevel,
  };
}

async function capCompareRoles(
  supabase: ReturnType<typeof createClient>,
  params: Record<string, unknown>,
  resolveRoleFn: typeof resolveRole,
  resolveGeoFn: typeof resolveGeography
): Promise<{ data: Record<string, unknown>; source: CISource; fallback_level: string | null }> {
  const roleA = await resolveRoleFn(supabase, params.role_a as string);
  const roleB = await resolveRoleFn(supabase, params.role_b as string);
  const geoA = await resolveGeoFn(supabase, params.geography as string);
  const geoB = params.geography_b
    ? await resolveGeoFn(supabase, params.geography_b as string)
    : geoA;

  if (!roleA || !roleB || !geoA || !geoB) throw new Error("ENTITY_NOT_RESOLVED");

  const empType = (params.employment_type as EmploymentType) || "anstalld";
  const resultA = await capLookupRate(supabase, { role: roleA, geography: geoA }, { employment_type: empType, role_a: params.role_a });
  const resultB = await capLookupRate(supabase, { role: roleB, geography: geoB }, { employment_type: empType, role_a: params.role_b });

  const rateA = resultA.data.amount as number;
  const rateB = resultB.data.amount as number;

  return {
    data: {
      role_a: resultA.data.role,
      role_b: resultB.data.role,
      geography: resultA.data.geography,
      role_a_rate: { amount: rateA, currency: "SEK", unit: "per_hour" },
      role_b_rate: { amount: rateB, currency: "SEK", unit: "per_hour" },
      difference_amount: rateA - rateB,
      difference_percent: rateB > 0 ? Math.round(((rateA - rateB) / rateB) * 100) : 0,
      role_a_monthly: { min: resultA.data.recommended_monthly_min, max: resultA.data.recommended_monthly_max },
      role_b_monthly: { min: resultB.data.recommended_monthly_min, max: resultB.data.recommended_monthly_max },
    },
    source: SOURCE_RATES,
    fallback_level: resultA.fallback_level ?? resultB.fallback_level,
  };
}

async function capSalaryBenchmark(
  supabase: ReturnType<typeof createClient>,
  resolved: ResolvedEntities,
  _params: Record<string, unknown>,
  sampleSizeMin: number
): Promise<{ data: Record<string, unknown>; source: CISource; fallback_level: string | null }> {
  const roleId = resolved.role!.role_id;
  const roleName = resolved.role!.name;
  const geoId = resolved.geography?.geo_id ?? null;

  const selectCols = "id, period_key, role_id, region_id, municipality_id, sample_size, mean_salary, median_salary, p25_salary, p75_salary";
  let data: Record<string, unknown> | null = null;
  let fallbackLevel: string | null = null;

  // 1. Municipality match
  if (geoId && resolved.geography?.type === "municipality") {
    const { data: exact } = await supabase
      .from("salary_benchmarks").select(selectCols)
      .eq("role_id", roleId).eq("municipality_id", geoId)
      .eq("threshold_passed", true)
      .order("period_key", { ascending: false }).limit(1).maybeSingle();
    if (exact) data = exact;
  }

  // 2. Region fallback
  if (!data && resolved.geography) {
    let regionGeoId: string | null = null;
    if (resolved.geography.type === "region") {
      regionGeoId = resolved.geography.geo_id;
    } else if (resolved.geography.region_name) {
      const { data: regionGeo } = await supabase
        .from("geographies").select("id").eq("type", "region").eq("name", resolved.geography.region_name).limit(1).maybeSingle();
      if (regionGeo) regionGeoId = regionGeo.id;
    }
    if (regionGeoId) {
      const { data: regionMatch } = await supabase
        .from("salary_benchmarks").select(selectCols)
        .eq("role_id", roleId).eq("region_id", regionGeoId)
        .eq("threshold_passed", true)
        .order("period_key", { ascending: false }).limit(1).maybeSingle();
      if (regionMatch) { data = regionMatch; fallbackLevel = "region"; }
    }
  }

  // 3. National fallback
  if (!data) {
    const { data: national } = await supabase
      .from("salary_benchmarks").select(selectCols)
      .eq("role_id", roleId).eq("threshold_passed", true)
      .is("municipality_id", null).is("region_id", null)
      .order("period_key", { ascending: false }).limit(1).maybeSingle();
    if (national) { data = national; fallbackLevel = fallbackLevel ? `${fallbackLevel}→national` : "national"; }
  }

  // 4. Any geo
  if (!data) {
    const { data: anyGeo } = await supabase
      .from("salary_benchmarks").select(selectCols)
      .eq("role_id", roleId).eq("threshold_passed", true)
      .order("period_key", { ascending: false }).limit(1).maybeSingle();
    if (anyGeo) { data = anyGeo; fallbackLevel = "any_geo"; }
  }

  if (!data) throw new Error("NO_DATA_FOUND");

  const sampleSize = (data.sample_size as number) ?? 0;
  if (sampleSize > 0 && sampleSize < sampleSizeMin) throw new Error("INSUFFICIENT_SAMPLE");

  const p25 = data.p25_salary as number | null;
  const median = data.median_salary as number | null;
  const p75 = data.p75_salary as number | null;
  const mean = data.mean_salary as number | null;
  const effectiveMedian = median ?? mean ?? 0;

  return {
    data: {
      role: { id: roleId, name: roleName },
      geography: resolved.geography ? { id: resolved.geography.geo_id, name: resolved.geography.name } : null,
      period: data.period_key,
      sample_size: sampleSize > 0 ? sampleSize : null,
      mean_salary: mean,
      median_salary: effectiveMedian,
      p25_salary: p25 ?? Math.round(effectiveMedian * 0.92),
      p75_salary: p75 ?? Math.round(effectiveMedian * 1.08),
    },
    source: SOURCE_BENCHMARKS,
    fallback_level: fallbackLevel,
  };
}

async function capSalaryPosition(
  supabase: ReturnType<typeof createClient>,
  resolved: ResolvedEntities,
  params: Record<string, unknown>,
  sampleSizeMin: number
): Promise<{ data: Record<string, unknown>; source: CISource; fallback_level: string | null }> {
  const benchResult = await capSalaryBenchmark(supabase, resolved, params, sampleSizeMin);
  const currentSalary = params.current_salary as number;
  const p75 = benchResult.data.p75_salary as number;
  const gap = p75 - currentSalary;
  const gapPct = currentSalary > 0 ? Math.round((gap / currentSalary) * 100) : 0;

  return {
    data: {
      role: benchResult.data.role,
      geography: benchResult.data.geography,
      period: benchResult.data.period,
      input_salary: currentSalary,
      benchmark_metric: "p75_salary",
      benchmark_value: p75,
      difference_amount: gap,
      difference_percent: gapPct,
      sample_size: benchResult.data.sample_size,
      p25_salary: benchResult.data.p25_salary,
      median_salary: benchResult.data.median_salary,
      p75_salary: benchResult.data.p75_salary,
    },
    source: benchResult.source,
    fallback_level: benchResult.fallback_level,
  };
}

// ── Audit Logger ─────────────────────────────────────────────────────────────

async function logQuery(
  supabase: ReturnType<typeof createClient>,
  entry: {
    channel?: string;
    client_type: string;
    client_ip: string;
    capability_key: string;
    capability_version: number;
    raw_input_text?: string;
    normalized_input_json?: Record<string, unknown>;
    resolved_entities_json?: ResolvedEntities;
    resolution_method?: string;
    confidence_score?: number;
    policy_result_json: PolicyResult;
    response_payload_json?: Record<string, unknown>;
  }
): Promise<string | null> {
  const { data } = await supabase
    .from("compensation_queries")
    .insert(entry)
    .select("id")
    .single();
  return data?.id ?? null;
}

// ── Main Handler ─────────────────────────────────────────────────────────────

// ── Publishing Pipeline ───────────────────────────────────────────────────────

async function publishBenchmarks(supabase: ReturnType<typeof createClient>): Promise<Response> {
  // 1. Read raw salary data from leads
  const { data: leads, error: leadsErr } = await supabase
    .from("leads")
    .select("id, yrke, kommun, current_salary, salary_type, employment_type, created_at")
    .not("current_salary", "is", null)
    .not("yrke", "is", null);

  if (leadsErr) throw new Error(`Failed to read leads: ${leadsErr.message}`);
  if (!leads?.length) {
    return new Response(JSON.stringify({ status: "empty", message: "No leads with salary data found", published: 0 }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2. Build role alias lookup (all aliases → role_id)
  const { data: roleAliases } = await supabase.from("role_aliases").select("alias, role_id");
  const roleAliasMap = new Map<string, string>();
  for (const ra of roleAliases ?? []) {
    roleAliasMap.set(ra.alias.toLowerCase(), ra.role_id);
  }

  // 3. Build geography lookup (kommun → region_id via geographies hierarchy)
  const { data: geoAliases } = await supabase.from("geography_aliases").select("alias, geo_id");
  const geoAliasMap = new Map<string, string>();
  for (const ga of geoAliases ?? []) {
    geoAliasMap.set(ga.alias.toLowerCase(), ga.geo_id);
  }

  // Load all geographies for parent resolution
  const { data: allGeos } = await supabase.from("geographies").select("id, name, type, parent_id");
  const geoById = new Map<string, { id: string; name: string; type: string; parent_id: string | null }>();
  for (const g of allGeos ?? []) {
    geoById.set(g.id, g);
  }

  function findRegionId(geoId: string): string | null {
    let current = geoById.get(geoId);
    let depth = 0;
    while (current && depth < 5) {
      if (current.type === "region") return current.id;
      if (!current.parent_id) break;
      current = geoById.get(current.parent_id);
      depth++;
    }
    return null;
  }

  // 4. Aggregate: group by role_id + region_id + period_key
  const currentYear = new Date().getFullYear();
  const periodKey = `${currentYear}`;

  type Bucket = { salaries: number[]; role_id: string; region_id: string | null };
  const buckets = new Map<string, Bucket>();
  let skipped = 0;

  for (const lead of leads) {
    // Resolve role
    const roleId = roleAliasMap.get((lead.yrke as string).toLowerCase());
    if (!roleId) { skipped++; continue; }

    // Resolve region (optional)
    let regionId: string | null = null;
    if (lead.kommun) {
      const geoId = geoAliasMap.get((lead.kommun as string).toLowerCase());
      if (geoId) {
        regionId = findRegionId(geoId);
      }
    }

    // Normalize salary to monthly
    let monthlySalary = lead.current_salary as number;
    if (lead.salary_type === "hourly") {
      monthlySalary = monthlySalary * 167; // hours_per_month
    }

    const key = `${roleId}||${regionId ?? "national"}||${periodKey}`;
    if (!buckets.has(key)) {
      buckets.set(key, { salaries: [], role_id: roleId, region_id: regionId });
    }
    buckets.get(key)!.salaries.push(monthlySalary);
  }

  // 5. Calculate statistics and upsert
  function percentile(sorted: number[], p: number): number {
    const idx = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo));
  }

  const rows: Array<Record<string, unknown>> = [];

  for (const [, bucket] of buckets) {
    const sorted = [...bucket.salaries].sort((a, b) => a - b);
    const n = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);

    rows.push({
      role_id: bucket.role_id,
      region_id: bucket.region_id,
      municipality_id: null,
      period_key: periodKey,
      sample_size: n,
      mean_salary: Math.round(sum / n),
      median_salary: percentile(sorted, 50),
      p25_salary: percentile(sorted, 25),
      p75_salary: percentile(sorted, 75),
      threshold_passed: n >= 10,
      updated_at: new Date().toISOString(),
    });
  }

  // Upsert in batches (delete existing for same period, then insert)
  // Simple idempotent approach: delete all for this period_key, then insert
  const { error: delErr } = await supabase
    .from("salary_benchmarks")
    .delete()
    .eq("period_key", periodKey);

  if (delErr) throw new Error(`Failed to clear old benchmarks: ${delErr.message}`);

  // Insert in batches of 50
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error: insErr } = await supabase.from("salary_benchmarks").insert(batch);
    if (insErr) throw new Error(`Failed to insert benchmarks: ${insErr.message}`);
    inserted += batch.length;
  }

  const passedCount = rows.filter(r => r.threshold_passed).length;

  return new Response(JSON.stringify({
    status: "success",
    period_key: periodKey,
    total_leads: leads.length,
    skipped_unresolved: skipped,
    buckets_created: rows.length,
    threshold_passed: passedCount,
    threshold_failed: rows.length - passedCount,
    published: inserted,
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Route: publish-benchmarks via body action or query param
  const url = new URL(req.url);
  const actionParam = url.searchParams.get("action");

  if (req.method === "POST") {
    // Try to peek at body for action routing
    const cloned = req.clone();
    let bodyAction: string | undefined;
    try {
      const peek = await cloned.json();
      bodyAction = peek?.action;
    } catch { /* not json or no action */ }

    if (actionParam === "publish-benchmarks" || bodyAction === "publish-benchmarks") {
      try {
        return await publishBenchmarks(supabase);
      } catch (error) {
        console.error("publish-benchmarks error:", error);
        return new Response(JSON.stringify({ status: "error", message: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  try {
    const body: CIRequest = await req.json();
    const { capability, version = 1, params, client_type = "anonymous_human" } = body;

    if (!capability || !params) {
      const policy: CIPolicy = { status: "blocked", client_type: client_type ?? "unknown", fallback_applied: false, fallback_level: null };
      const envelope = buildResponse(null, capability ?? "unknown", null, null, policy, [makeError("INVALID_INPUT", "Saknar obligatoriska fält: capability, params")]);
      return new Response(JSON.stringify(envelope), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1. Validate capability
    const { data: capDef } = await supabase
      .from("capability_definitions")
      .select("capability_key, version, is_active")
      .eq("capability_key", capability).eq("is_active", true)
      .limit(1).maybeSingle();

    if (!capDef) {
      const policy: CIPolicy = { status: "blocked", client_type, fallback_applied: false, fallback_level: null };
      const envelope = buildResponse(null, capability, null, null, policy, [makeError("INVALID_INPUT", `Okänd eller inaktiv capability: ${capability}`)]);
      return new Response(JSON.stringify(envelope), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Policy evaluation
    const { result: policyResult, profile } = await evaluatePolicy(supabase, capability, params, clientIp, client_type);

    if (policyResult.status === "blocked") {
      const errorCode = policyResult.reason ?? "RATE_LIMITED";
      const queryId = await logQuery(supabase, {
        client_type, client_ip: clientIp,
        capability_key: capability, capability_version: version,
        raw_input_text: JSON.stringify(params),
        policy_result_json: policyResult,
      });

      const policy: CIPolicy = { status: "blocked", client_type, fallback_applied: false, fallback_level: null };
      const envelope = buildResponse(queryId, capability, null, null, policy, [makeError(errorCode)]);
      return new Response(JSON.stringify(envelope), { status: errorHttpStatus(errorCode), headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Entity resolution
    const resolved: ResolvedEntities = {};
    let resolutionMethod = "none";
    let confidenceScore = 1.0;

    const rawRole = (params.role ?? params.role_a) as string | undefined;
    if (rawRole) {
      const roleResult = await resolveRole(supabase, rawRole);
      if (!roleResult) throw new Error("ENTITY_NOT_RESOLVED");
      resolved.role = roleResult;
      resolutionMethod = roleResult.method;
      confidenceScore = Math.min(confidenceScore, roleResult.confidence);
    }

    const rawGeo = params.geography as string | undefined;
    if (rawGeo) {
      const geoResult = await resolveGeography(supabase, rawGeo);
      if (!geoResult) throw new Error("ENTITY_NOT_RESOLVED");
      resolved.geography = geoResult;
      resolutionMethod += `+${geoResult.method}`;
      confidenceScore = Math.min(confidenceScore, geoResult.confidence);
    }

    // 4. Execute capability
    let capResult: { data: Record<string, unknown>; source: CISource; fallback_level: string | null };
    const sampleSizeMin = profile.policy_rules.sample_size_min;

    switch (capability) {
      case "lookup_rate":
        capResult = await capLookupRate(supabase, resolved, params);
        break;
      case "compare_roles":
        capResult = await capCompareRoles(supabase, params, resolveRole, resolveGeography);
        break;
      case "salary_benchmark":
        capResult = await capSalaryBenchmark(supabase, resolved, params, sampleSizeMin);
        break;
      case "salary_position":
        capResult = await capSalaryPosition(supabase, resolved, params, sampleSizeMin);
        break;
      default:
        throw new Error("INVALID_INPUT");
    }

    // Build policy object
    const fallbackApplied = !!capResult.fallback_level;
    const finalPolicyResult: PolicyResult = fallbackApplied
      ? { ...policyResult, status: "fallback", reason: `Fallback: ${capResult.fallback_level}` }
      : policyResult;

    const policy: CIPolicy = {
      status: finalPolicyResult.status,
      client_type,
      fallback_applied: fallbackApplied,
      fallback_level: capResult.fallback_level,
    };

    // 5. Audit log
    const queryId = await logQuery(supabase, {
      client_type,
      client_ip: clientIp,
      capability_key: capability,
      capability_version: version,
      raw_input_text: JSON.stringify(params),
      normalized_input_json: params,
      resolved_entities_json: resolved,
      resolution_method: resolutionMethod,
      confidence_score: confidenceScore,
      policy_result_json: finalPolicyResult,
      response_payload_json: capResult.data,
    });

    // 6. Response
    const envelope = buildResponse(queryId, capability, capResult.data, capResult.source, policy, []);
    return new Response(JSON.stringify(envelope), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    const errMsg = error.message || "Unknown error";
    const errorCode = ERROR_CODES[errMsg] ? errMsg : "INTERNAL_ERROR";

    const queryId = await logQuery(supabase, {
      client_type: "unknown",
      client_ip: clientIp,
      capability_key: "unknown",
      capability_version: 1,
      raw_input_text: errMsg,
      policy_result_json: { status: "blocked", reason: errorCode, applied_rules: [] },
    }).catch(() => null);

    const policy: CIPolicy = { status: "blocked", client_type: "unknown", fallback_applied: false, fallback_level: null };
    const envelope = buildResponse(queryId, "unknown", null, null, policy, [makeError(errorCode)]);

    if (errorCode === "INTERNAL_ERROR") console.error("compensation-intelligence error:", error);

    return new Response(JSON.stringify(envelope), { status: errorHttpStatus(errorCode), headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
