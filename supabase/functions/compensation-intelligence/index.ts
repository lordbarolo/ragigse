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

// ── Types ────────────────────────────────────────────────────────────────────
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

interface ResolvedEntities {
  role?: { canonical: string; method: string; confidence: number };
  geography?: { kommun: string; zon: string; region: string; method: string; confidence: number };
}

interface CIRequest {
  capability: string;
  version?: number;
  params: Record<string, unknown>;
  client_type?: string;
}

interface CIResponse {
  query_id?: string;
  capability: string;
  version: number;
  data: Record<string, unknown> | null;
  source_metadata?: Record<string, unknown>;
  policy_status: PolicyResult;
  error?: string;
}

// ── Entity Resolver ──────────────────────────────────────────────────────────

async function resolveRole(
  supabase: ReturnType<typeof createClient>,
  rawRole: string
): Promise<{ canonical: string; method: string; confidence: number } | null> {
  // 1. Exact match in role_aliases
  const { data: exact } = await supabase
    .from("role_aliases")
    .select("canonical_name")
    .ilike("alias", rawRole)
    .limit(1)
    .maybeSingle();

  if (exact) return { canonical: exact.canonical_name, method: "alias_exact", confidence: 1.0 };

  // 2. ILIKE fuzzy
  const { data: fuzzy } = await supabase
    .from("role_aliases")
    .select("canonical_name")
    .ilike("alias", `%${rawRole}%`)
    .limit(1)
    .maybeSingle();

  if (fuzzy) return { canonical: fuzzy.canonical_name, method: "alias_fuzzy", confidence: 0.8 };

  // 3. Stem fallback
  const stem = rawRole.trim().toLowerCase().replace(/(orna|arna|erna|or|ar|er|a|e|n)$/u, "");
  if (stem.length >= 4) {
    const { data: stemMatch } = await supabase
      .from("role_aliases")
      .select("canonical_name")
      .ilike("canonical_name", `%${stem}%`)
      .limit(1)
      .maybeSingle();
    if (stemMatch) return { canonical: stemMatch.canonical_name, method: "stem", confidence: 0.6 };
  }

  return null;
}

async function resolveGeography(
  supabase: ReturnType<typeof createClient>,
  rawGeo: string
): Promise<{ kommun: string; zon: string; region: string; method: string; confidence: number } | null> {
  // 1. Exact match in geography_aliases
  const { data: exact } = await supabase
    .from("geography_aliases")
    .select("canonical_kommun, canonical_zon, canonical_region")
    .ilike("alias", rawGeo)
    .limit(1)
    .maybeSingle();

  if (exact) {
    return {
      kommun: exact.canonical_kommun,
      zon: exact.canonical_zon,
      region: exact.canonical_region,
      method: "alias_exact",
      confidence: 1.0,
    };
  }

  // 2. Fuzzy match
  const { data: fuzzy } = await supabase
    .from("geography_aliases")
    .select("canonical_kommun, canonical_zon, canonical_region")
    .ilike("alias", `%${rawGeo}%`)
    .limit(1)
    .maybeSingle();

  if (fuzzy) {
    return {
      kommun: fuzzy.canonical_kommun,
      zon: fuzzy.canonical_zon,
      region: fuzzy.canonical_region,
      method: "alias_fuzzy",
      confidence: 0.8,
    };
  }

  // 3. Direct locations table fallback
  const { data: locData } = await supabase
    .from("locations")
    .select("kommun, zon, region")
    .ilike("kommun", rawGeo)
    .limit(1)
    .maybeSingle();

  if (locData) {
    return {
      kommun: locData.kommun,
      zon: locData.zon,
      region: locData.region,
      method: "locations_direct",
      confidence: 0.7,
    };
  }

  return null;
}

// ── Policy Layer ─────────────────────────────────────────────────────────────

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
    return { pass: false, rule: "rate_limit", reason: `Rate limit exceeded: ${profile.rate_limit_per_minute}/min` };
  }
  return { pass: true, rule: "rate_limit" };
}

function checkCapabilityAccess(capability: string, profile: ClientProfile): PolicyRuleResult {
  if (!profile.allowed_capabilities.includes(capability)) {
    return { pass: false, rule: "capability_access", reason: `Capability '${capability}' not allowed for this client type` };
  }
  return { pass: true, rule: "capability_access" };
}

function checkQueryBreadth(params: Record<string, unknown>, capability: string): PolicyRuleResult {
  if (capability === "lookup_rate" || capability === "compare_roles") {
    if (!params.role && !params.role_a) {
      return { pass: false, rule: "query_breadth", reason: "Role parameter is required" };
    }
    if (!params.geography) {
      return { pass: false, rule: "query_breadth", reason: "Geography parameter is required" };
    }
  }
  if (capability === "salary_benchmark" || capability === "salary_position") {
    if (!params.role) {
      return { pass: false, rule: "query_breadth", reason: "Role parameter is required" };
    }
    if (!params.sector) {
      return { pass: false, rule: "query_breadth", reason: "Sector parameter is required" };
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

  // Check if same geography but different roles
  const geos = new Set<string>();
  const roles = new Set<string>();
  for (const q of recentQueries) {
    const entities = q.resolved_entities_json as ResolvedEntities | null;
    if (entities?.geography) geos.add(entities.geography.kommun);
    if (entities?.role) roles.add(entities.role.canonical);
  }

  if (geos.size <= 1 && roles.size >= profile.policy_rules.anti_enum_max_sequential) {
    return { pass: false, rule: "anti_enumeration", reason: "Too many sequential lookups for different roles in same geography" };
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
  // Load client profile
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

  // 1. Capability access
  rules.push(checkCapabilityAccess(capability, profile));

  // 2. Query breadth
  rules.push(checkQueryBreadth(params, capability));

  // 3. Rate limit
  rules.push(await checkRateLimit(supabase, clientIp, profile));

  // 4. Anti-enumeration (only for lookup capabilities)
  if (capability === "lookup_rate" || capability === "compare_roles") {
    rules.push(await checkAntiEnumeration(supabase, clientIp, capability, profile));
  }

  const failedRules = rules.filter((r) => !r.pass);
  const appliedRules = rules.map((r) => r.rule);

  if (failedRules.length > 0) {
    return {
      result: {
        status: "blocked",
        reason: failedRules[0].reason,
        applied_rules: appliedRules,
      },
      profile,
    };
  }

  return {
    result: { status: "allowed", applied_rules: appliedRules },
    profile,
  };
}

// ── Capability Layer ─────────────────────────────────────────────────────────

// HARD RULE: These capabilities ONLY read from these tables
const ALLOWED_TABLES = {
  lookup_rate: ["rates", "locations", "margin_models"],
  compare_roles: ["rates", "locations", "margin_models"],
  salary_benchmark: ["salary_benchmarks"],
  salary_position: ["salary_benchmarks"],
} as const;

async function capLookupRate(
  supabase: ReturnType<typeof createClient>,
  resolved: ResolvedEntities,
  params: Record<string, unknown>
): Promise<{ data: Record<string, unknown>; source_metadata: Record<string, unknown>; fallback_used?: string }> {
  const geo = resolved.geography!;
  const role = resolved.role!;
  const empType = (params.employment_type as EmploymentType) || "anstalld";

  // 1. Fetch margin model
  const { data: modelData } = await supabase
    .from("margin_models")
    .select("share_min, share_max, employer_factor, hours_per_month")
    .eq("name", "default")
    .eq("is_active", true)
    .limit(1)
    .single();

  const baseModel: MarginModel | undefined = modelData
    ? {
        share_min: Number(modelData.share_min),
        share_max: Number(modelData.share_max),
        employer_factor: Number(modelData.employer_factor),
        hours_per_month: Number(modelData.hours_per_month),
      }
    : undefined;

  // Foretagare adjustment
  const FORETAGARE_SHARE_MIN = 0.85;
  const FORETAGARE_SHARE_MAX = 0.92;
  const effectiveModel: MarginModel | undefined = baseModel
    ? empType === "foretagare"
      ? { ...baseModel, share_min: FORETAGARE_SHARE_MIN, share_max: FORETAGARE_SHARE_MAX }
      : baseModel
    : empType === "foretagare"
      ? { share_min: FORETAGARE_SHARE_MIN, share_max: FORETAGARE_SHARE_MAX, employer_factor: 1.42, hours_per_month: 167 }
      : undefined;

  // 2. Look up rate with fallback chain
  let timprisKund = 0;
  let matchedOccupation = role.canonical;
  let fallbackUsed: string | undefined;

  // Try exact match
  const { data: rateData } = await supabase
    .from("rates")
    .select("timpris_kund, yrkeskategori")
    .eq("yrkeskategori", role.canonical)
    .eq("zon", geo.zon)
    .limit(1);

  if (rateData && rateData.length > 0) {
    timprisKund = rateData[0].timpris_kund;
    matchedOccupation = rateData[0].yrkeskategori;
  } else {
    // Fallback: occupation → typ → zon
    const { data: anyRate } = await supabase
      .from("rates")
      .select("typ")
      .eq("yrkeskategori", role.canonical)
      .limit(1);

    if (anyRate && anyRate.length > 0) {
      const { data: zoneRate } = await supabase
        .from("rates")
        .select("timpris_kund")
        .eq("typ", anyRate[0].typ)
        .eq("zon", geo.zon)
        .limit(1);

      if (zoneRate && zoneRate.length > 0) {
        timprisKund = zoneRate[0].timpris_kund;
        fallbackUsed = "typ_zon";
      }
    }
  }

  if (timprisKund === 0) {
    throw new Error("NO_RATE_FOUND");
  }

  const range = calculateSalaryRange(timprisKund, empType, effectiveModel);
  const m = effectiveModel ?? { share_min: 0.85, share_max: 0.90, employer_factor: 1.42, hours_per_month: 167 };
  const factor = empType === "anstalld" ? m.employer_factor : 1;

  return {
    data: {
      occupation: matchedOccupation,
      kommun: geo.kommun,
      zon: geo.zon,
      region: geo.region,
      employment_type: empType,
      rate_customer_sek_per_hour: timprisKund,
      consultant_share_min: m.share_min,
      consultant_share_max: m.share_max,
      employee_factor: factor,
      hours_per_month: m.hours_per_month,
      recommended_hourly_min: range.hourly_min,
      recommended_hourly_max: range.hourly_max,
      recommended_monthly_min: range.monthly_min,
      recommended_monthly_max: range.monthly_max,
    },
    source_metadata: {
      source: "SKR ramavtal 2026",
      data_freshness: "2026-01-01",
      contract_version: "SKR 2026 v1.0",
      coverage: "290+ kommuner, 4 priszoner",
      tables_used: ALLOWED_TABLES.lookup_rate,
    },
    fallback_used: fallbackUsed,
  };
}

async function capCompareRoles(
  supabase: ReturnType<typeof createClient>,
  params: Record<string, unknown>,
  resolveRoleFn: typeof resolveRole,
  resolveGeoFn: typeof resolveGeography
): Promise<{ data: Record<string, unknown>; source_metadata: Record<string, unknown> }> {
  const roleA = await resolveRoleFn(supabase, params.role_a as string);
  const roleB = await resolveRoleFn(supabase, params.role_b as string);
  const geoA = await resolveGeoFn(supabase, params.geography as string);
  const geoB = params.geography_b
    ? await resolveGeoFn(supabase, params.geography_b as string)
    : geoA;

  if (!roleA || !roleB || !geoA || !geoB) {
    throw new Error("ENTITY_NOT_RESOLVED");
  }

  const empType = (params.employment_type as EmploymentType) || "anstalld";

  const resultA = await capLookupRate(supabase, { role: roleA, geography: geoA }, { employment_type: empType });
  const resultB = await capLookupRate(supabase, { role: roleB, geography: geoB }, { employment_type: empType });

  const midA = ((resultA.data.recommended_monthly_min as number) + (resultA.data.recommended_monthly_max as number)) / 2;
  const midB = ((resultB.data.recommended_monthly_min as number) + (resultB.data.recommended_monthly_max as number)) / 2;

  return {
    data: {
      role_a: resultA.data,
      role_b: resultB.data,
      diff_monthly: Math.round(midA - midB),
      diff_hourly: (resultA.data.recommended_hourly_min as number) - (resultB.data.recommended_hourly_min as number),
      diff_pct: midB > 0 ? Math.round(((midA - midB) / midB) * 100) : 0,
    },
    source_metadata: {
      source: "SKR ramavtal 2026",
      tables_used: ALLOWED_TABLES.compare_roles,
    },
  };
}

async function capSalaryBenchmark(
  supabase: ReturnType<typeof createClient>,
  resolved: ResolvedEntities,
  params: Record<string, unknown>,
  sampleSizeMin: number
): Promise<{ data: Record<string, unknown>; source_metadata: Record<string, unknown>; fallback_used?: string }> {
  // HARD RULE: ONLY salary_benchmarks table
  const occupation = resolved.role!.canonical;
  const sector = params.sector as string;
  const selectCols = "occupation, sector, average_monthly, percentile_25, percentile_50, percentile_75, region, year, source, sample_size";

  let data: Record<string, unknown> | null = null;
  let fallbackUsed: string | undefined;

  // 1. Exact match
  const { data: exact } = await supabase
    .from("salary_benchmarks")
    .select(selectCols)
    .eq("occupation", occupation)
    .eq("sector", sector)
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (exact) {
    data = exact;
  }

  // 2. ILIKE
  if (!data) {
    const { data: fuzzy } = await supabase
      .from("salary_benchmarks")
      .select(selectCols)
      .eq("sector", sector)
      .ilike("occupation", `%${occupation}%`)
      .order("year", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fuzzy) { data = fuzzy; fallbackUsed = "ilike"; }
  }

  // 3. Stem
  if (!data) {
    const stem = occupation.trim().toLowerCase().replace(/(orna|arna|erna|or|ar|er|a|e|n)$/u, "");
    if (stem.length >= 4) {
      const { data: stemMatch } = await supabase
        .from("salary_benchmarks")
        .select(selectCols)
        .eq("sector", sector)
        .ilike("occupation", `%${stem}%`)
        .order("year", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (stemMatch) { data = stemMatch; fallbackUsed = "stem"; }
    }
  }

  // 4. Cross-sector fallback
  if (!data) {
    const { data: crossSector } = await supabase
      .from("salary_benchmarks")
      .select(selectCols)
      .ilike("occupation", `%${occupation}%`)
      .order("year", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (crossSector) { data = crossSector; fallbackUsed = "cross_sector"; }
  }

  if (!data) {
    throw new Error("NO_BENCHMARK_DATA");
  }

  // POLICY: Sample size check
  const sampleSize = (data.sample_size as number) ?? 0;
  if (sampleSize > 0 && sampleSize < sampleSizeMin) {
    throw new Error("INSUFFICIENT_SAMPLE");
  }

  const p25 = (data.percentile_25 as number) ?? Math.round((data.average_monthly as number) * 0.92);
  const p50 = (data.percentile_50 as number) ?? (data.average_monthly as number);
  const p75 = (data.percentile_75 as number) ?? Math.round((data.average_monthly as number) * 1.08);

  return {
    data: {
      occupation: data.occupation,
      sector: data.sector,
      region: data.region,
      year: data.year,
      source: data.source,
      percentile_25: p25,
      percentile_50: p50,
      percentile_75: p75,
    },
    source_metadata: {
      source: data.source ?? "SCB lönestatistik",
      tables_used: ALLOWED_TABLES.salary_benchmark,
      sample_size: sampleSize > 0 ? sampleSize : null,
    },
    fallback_used: fallbackUsed,
  };
}

async function capSalaryPosition(
  supabase: ReturnType<typeof createClient>,
  resolved: ResolvedEntities,
  params: Record<string, unknown>,
  sampleSizeMin: number
): Promise<{ data: Record<string, unknown>; source_metadata: Record<string, unknown> }> {
  // HARD RULE: delegates to salary_benchmark which ONLY reads salary_benchmarks
  const benchResult = await capSalaryBenchmark(supabase, resolved, params, sampleSizeMin);
  const currentSalary = params.current_salary as number;

  const p75 = benchResult.data.percentile_75 as number;
  const gap = p75 - currentSalary;
  const gapPct = Math.round((gap / currentSalary) * 100);

  let category: "small" | "medium" | "large";
  const gapRatio = gap / currentSalary;
  if (gapRatio <= 0.05) category = "small";
  else if (gapRatio <= 0.15) category = "medium";
  else category = "large";

  return {
    data: {
      ...benchResult.data,
      current_salary: currentSalary,
      gap_vs_p75: gap,
      gap_pct: gapPct,
      category,
    },
    source_metadata: {
      ...benchResult.source_metadata,
      tables_used: ALLOWED_TABLES.salary_position,
    },
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

// ── Error mapping ────────────────────────────────────────────────────────────

const ERROR_MAP: Record<string, { status: number; code: string; message: string }> = {
  NO_RATE_FOUND: { status: 404, code: "NO_RATE_FOUND", message: "No rate found for this occupation and zone" },
  NO_BENCHMARK_DATA: { status: 404, code: "NO_BENCHMARK_DATA", message: "No benchmark data available for this occupation" },
  INSUFFICIENT_SAMPLE: { status: 422, code: "INSUFFICIENT_SAMPLE", message: "Sample size below minimum threshold (n≥10 required)" },
  ENTITY_NOT_RESOLVED: { status: 404, code: "ENTITY_NOT_RESOLVED", message: "Could not resolve one or more entities (role or geography)" },
  CAPABILITY_NOT_FOUND: { status: 404, code: "CAPABILITY_NOT_FOUND", message: "Unknown capability" },
};

// ── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  try {
    const body: CIRequest = await req.json();
    const { capability, version = 1, params, client_type = "anonymous_human" } = body;

    if (!capability || !params) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: capability, params" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 1. Validate capability exists ──
    const { data: capDef } = await supabase
      .from("capability_definitions")
      .select("capability_key, version, is_active")
      .eq("capability_key", capability)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!capDef) {
      return new Response(
        JSON.stringify({ error: "CAPABILITY_NOT_FOUND", message: `Unknown or inactive capability: ${capability}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Policy evaluation ──
    const { result: policyResult, profile } = await evaluatePolicy(
      supabase, capability, params, clientIp, client_type
    );

    if (policyResult.status === "blocked") {
      await logQuery(supabase, {
        client_type, client_ip: clientIp,
        capability_key: capability, capability_version: version,
        raw_input_text: JSON.stringify(params),
        policy_result_json: policyResult,
      });

      return new Response(
        JSON.stringify({
          capability, version, data: null,
          policy_status: policyResult,
          error: policyResult.reason,
        } satisfies CIResponse),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Entity resolution ──
    const resolved: ResolvedEntities = {};
    let resolutionMethod = "none";
    let confidenceScore = 1.0;

    // Resolve role
    const rawRole = (params.role ?? params.role_a) as string | undefined;
    if (rawRole) {
      const roleResult = await resolveRole(supabase, rawRole);
      if (!roleResult) throw new Error("ENTITY_NOT_RESOLVED");
      resolved.role = roleResult;
      resolutionMethod = roleResult.method;
      confidenceScore = Math.min(confidenceScore, roleResult.confidence);
    }

    // Resolve geography
    const rawGeo = params.geography as string | undefined;
    if (rawGeo) {
      const geoResult = await resolveGeography(supabase, rawGeo);
      if (!geoResult) throw new Error("ENTITY_NOT_RESOLVED");
      resolved.geography = geoResult;
      resolutionMethod += `+${geoResult.method}`;
      confidenceScore = Math.min(confidenceScore, geoResult.confidence);
    }

    // ── 4. Execute capability ──
    let capResult: { data: Record<string, unknown>; source_metadata: Record<string, unknown>; fallback_used?: string };
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
        throw new Error("CAPABILITY_NOT_FOUND");
    }

    // Update policy status if fallback was used
    const finalPolicyResult: PolicyResult = capResult.fallback_used
      ? { ...policyResult, status: "fallback", reason: `Fallback used: ${capResult.fallback_used}` }
      : policyResult;

    // ── 5. Audit log ──
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

    // ── 6. Response ──
    const response: CIResponse = {
      query_id: queryId ?? undefined,
      capability,
      version: capDef.version,
      data: capResult.data,
      source_metadata: capResult.source_metadata,
      policy_status: finalPolicyResult,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errMsg = error.message || "Unknown error";
    const mapped = ERROR_MAP[errMsg];

    // Log error
    await logQuery(supabase, {
      client_type: "unknown",
      client_ip: clientIp,
      capability_key: "unknown",
      capability_version: 1,
      raw_input_text: errMsg,
      policy_result_json: { status: "blocked", reason: errMsg, applied_rules: [] },
    }).catch(() => {});

    if (mapped) {
      return new Response(
        JSON.stringify({ error: mapped.code, message: mapped.message }),
        { status: mapped.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.error("compensation-intelligence error:", error);
    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR", message: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
