import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronLeft, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useLocations } from "@/hooks/useCalculator";
import { supabase } from "@/integrations/supabase/client";
import SearchableSelect from "@/components/SearchableSelect";
import {
  DOCTOR_SPECIALTIES as TOP_DOCTOR_SPECIALTIES,
  NURSE_SPECIALIZATIONS as TOP_NURSE_SPECIALIZATIONS,
  resolveYrke as resolveYrkeBase,
  type RoleGroup,
} from "@/lib/specialityLists";
import { getMarginShares } from "@/lib/calc";

/* ───────────────────── data (same shape as MarketSearchBox) ───────────────────── */
const DEFAULT_EMPLOYER_FACTOR = 1.38;
const DEFAULT_HOURS_PER_MONTH = 167;

const CATEGORIES: { value: RoleGroup; label: string }[] = [
  { value: "lakare", label: "Läkare" },
  { value: "ssk", label: "Sjuksköterska / Barnmorska" },
];

// Specialty lists, nurseValueMap & resolveYrke imported from @/lib/specialityLists
// HeroRateFinder uses an opinionated resolveYrke for a few common doctor specs
// (rather than the generic prefix), so we override resolveYrke locally for läkare.
function resolveYrkeHero(category: RoleGroup, dropdownValue: string): string {
  if (category === "lakare") {
    if (dropdownValue === "Anestesi och intensivvård") return "Specialistläkare anestesi och intensivvård";
    if (dropdownValue === "Barn- och ungdomsmedicin") return "Specialistläkare barn- och ungdomsmedicin";
    if (dropdownValue === "Obstetrik och gynekologi") return "Specialistläkare obstetrik och gynekologi";
  }
  return resolveYrkeBase(category, dropdownValue);
}

function getMargins(role: string) {
  const { share_min, share_max, margin_text } = getMarginShares(role);
  // Mid-point of the agency margin (1 - mid share)
  const midShare = (share_min + share_max) / 2;
  const marginMidPct = Math.round((1 - midShare) * 100 * 10) / 10;
  return { keepMin: share_min, keepMax: share_max, marginMidPct, marginText: margin_text };
}

interface RateResult {
  kommun: string;
  region: string;
  zon: string;
  roleName: string;
  timpris: number;
  hourlyMin: number;
  hourlyMax: number;
  monthlyMin: number;
  monthlyMax: number;
  marginText: string;
  marginMidPct: number;
  marginKrMin: number;
  marginKrMax: number;
  bestZon: string | null;
  bestZonDelta: number;
  bestZonPrice: number;
}

/* ─── Animated counter ─── */
function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);
  useEffect(() => {
    if (!target) {
      setValue(0);
      prevTarget.current = 0;
      return;
    }
    const start = performance.now();
    const from = prevTarget.current;
    const to = target;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    prevTarget.current = to;
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const fmt = (v: number) => v.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

/* Default demo values shown before user interacts */
const DEFAULT_RESULT: RateResult = {
  kommun: "Stockholm",
  region: "Stockholm",
  zon: "Zon 1",
  roleName: "Leg. sjuksköterska i storstad",
  timpris: 616,
  hourlyMin: 432,
  hourlyMax: 482,
  monthlyMin: 72144,
  monthlyMax: 80494,
  marginText: "15–20 %",
  marginMidPct: 17.5,
  marginKrMin: 92,
  marginKrMax: 123,
  bestZon: "Zon 3",
  bestZonDelta: 99,
  bestZonPrice: 715,
};

interface Props {
  prefillKey?: string; // for /?yrke=... CTA routing
}

export default function HeroRateFinder({ prefillKey }: Props) {
  const { data: locations } = useLocations();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<RoleGroup | null>(null);
  const [roleDropdownValue, setRoleDropdownValue] = useState("");
  const [selectedKommun, setSelectedKommun] = useState("");
  const [employmentType, setEmploymentType] = useState<"anstalld" | "foretagare">("anstalld");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RateResult | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  // Email capture state
  const [email, setEmail] = useState("");
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const doctorRoleOptions = useMemo(() => [
    { value: "__leg", label: "Leg. läkare" },
    { value: "__st", label: "ST-läkare" },
    ...TOP_DOCTOR_SPECIALTIES.map((s) => ({ value: s, label: s })),
    { value: "__ovrig", label: "Övrig specialisering" },
  ], []);

  const nurseRoleOptions = useMemo(() => [
    { value: "__allman", label: "Allmänsjuksköterska" },
    { value: "__barnmorska", label: "Barnmorska" },
    { value: "__rontgen", label: "Röntgensjuksköterska" },
    ...TOP_NURSE_SPECIALIZATIONS.map((s) => ({ value: s, label: s })),
    { value: "__ovrig", label: "Övrig VUB" },
  ], []);

  const roleOptions = selectedCategory === "lakare" ? doctorRoleOptions : nurseRoleOptions;

  const resolvedYrke = useMemo(() => {
    if (!selectedCategory || !roleDropdownValue) return "";
    return resolveYrkeHero(selectedCategory, roleDropdownValue);
  }, [selectedCategory, roleDropdownValue]);

  const selectedLocation = useMemo(
    () => locations?.find((l) => l.kommun === selectedKommun) ?? null,
    [locations, selectedKommun]
  );

  const kommunOptions = useMemo(() => {
    if (!locations) return [];
    return locations.map((l) => ({ value: l.kommun, label: `${l.kommun} (${l.region})` }));
  }, [locations]);

  const handleCategorySelect = (cat: RoleGroup) => {
    setSelectedCategory(cat);
    setRoleDropdownValue("");
    setSelectedKommun("");
    setResult(null);
    setError(null);
    setHasInteracted(true);
  };

  const handleBack = () => {
    setSelectedCategory(null);
    setRoleDropdownValue("");
    setSelectedKommun("");
    setResult(null);
    setError(null);
  };

  // Clear stale data immediately when selection changes
  useEffect(() => {
    setResult(null);
    setError(null);
  }, [resolvedYrke, selectedLocation?.kommun, employmentType]);

  useEffect(() => {
    if (!resolvedYrke || !selectedLocation) {
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchRate = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fnErr } = await supabase.functions.invoke("pricing-engine", {
          body: {
            occupation: resolvedYrke,
            kommun: selectedLocation.kommun,
            employment_type: employmentType,
          },
        });
        if (fnErr) throw fnErr;
        if (!data?.rate_customer_sek_per_hour) throw new Error("NO_RATE_FOUND");

        const { keepMin, keepMax, marginText, marginMidPct } = getMargins(resolvedYrke);
        const timpris = Number(data.rate_customer_sek_per_hour);
        const employerFactor = Number(data.employee_factor ?? DEFAULT_EMPLOYER_FACTOR);
        const hoursPerMonth = Number(data.hours_per_month ?? DEFAULT_HOURS_PER_MONTH);

        // For "anstalld": gross salary = (timpris × keep) / employer_factor (1.47)
        // For "foretagare": hourly = timpris × keep (no employer factor)
        const factor = employmentType === "anstalld" ? employerFactor : 1;
        const hourlyMin = Math.round((timpris * keepMin) / factor);
        const hourlyMax = Math.round((timpris * keepMax) / factor);
        const monthlyMin = Math.round(hourlyMin * hoursPerMonth);
        const monthlyMax = Math.round(hourlyMax * hoursPerMonth);
        const marginKrMin = Math.round(timpris * (1 - keepMax));
        const marginKrMax = Math.round(timpris * (1 - keepMin));

        // Zone comparison: query rates for same role across zones
        let bestZon: string | null = null;
        let bestZonDelta = 0;
        let bestZonPrice = 0;
        try {
          const { data: zoneRates } = await supabase
            .from("rates")
            .select("zon, timpris_kund")
            .eq("yrkeskategori", data.occupation || resolvedYrke)
            .eq("typ", "Grundpris");
          if (zoneRates && zoneRates.length > 0) {
            const max = zoneRates.reduce((a, b) => (b.timpris_kund > a.timpris_kund ? b : a));
            if (max.zon !== selectedLocation.zon && max.timpris_kund > timpris) {
              bestZon = max.zon;
              bestZonPrice = max.timpris_kund;
              bestZonDelta = Math.round((max.timpris_kund - timpris) * keepMax);
            }
          }
        } catch { /* non-blocking */ }

        if (cancelled) return;
        setResult({
          kommun: selectedLocation.kommun,
          region: selectedLocation.region,
          zon: selectedLocation.zon,
          roleName: resolvedYrke,
          timpris,
          hourlyMin,
          hourlyMax,
          monthlyMin,
          monthlyMax,
          marginText,
          marginMidPct,
          marginKrMin,
          marginKrMax,
          bestZon,
          bestZonDelta,
          bestZonPrice,
        });
      } catch {
        if (cancelled) return;
        setError("Kunde inte hämta pris för det valet just nu.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRate();
    return () => { cancelled = true; };
  }, [resolvedYrke, selectedLocation, selectedCategory, employmentType, retryNonce]);

  // Display values: real result, or default demo. Hide stale numbers on error.
  const showPlaceholder = !!error;
  const display = result ?? DEFAULT_RESULT;
  const animatedTimpris = useCountUp(showPlaceholder ? 0 : display.timpris);
  const animatedHourly = useCountUp(showPlaceholder ? 0 : display.hourlyMax);

  const handleSubmitLead = async () => {
    if (!emailValid || !result || submittingLead) return;
    setSubmittingLead(true);
    setLeadError(null);
    try {
      const { data, error: insErr } = await supabase
        .from("leads")
        .insert({
          email: email.trim().toLowerCase(),
          yrke: result.roleName,
          kommun: result.kommun,
          employment_type: employmentType,
          source: "hero_rate_finder",
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      if (data?.id) {
        navigate(`/resultat/${data.id}`);
      } else {
        navigate("/");
      }
    } catch (e) {
      setLeadError("Kunde inte skicka. Försök igen.");
      setSubmittingLead(false);
    }
  };

  return (
    <div className="relative z-10 flex flex-col gap-4 w-full max-w-[300px] flex-shrink-0 mx-auto md:mx-0 md:ml-auto md:mr-16 py-4 md:py-24 md:self-center">
      {/* ── Picker ─────────────────────────────── */}
      <div className="bg-white/[0.07] border border-white/[0.13] rounded-[14px] px-4 py-4 backdrop-blur-sm">
        {!selectedCategory ? (
          <>
            <div className="text-[10px] text-white/80 uppercase tracking-wider mb-2.5">Välj din roll — se ditt pris</div>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => handleCategorySelect(cat.value)}
                  className="text-left bg-white/[0.05] hover:bg-white/[0.12] border border-white/15 hover:border-[rgba(175,169,236,0.5)] rounded-lg px-3 py-2.5 transition-all"
                >
                  <span className="text-[12px] font-medium text-white leading-tight block">{cat.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-[11px] text-white/60 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
                Tillbaka
              </button>
              <span className="text-[10px] text-[#AFA9EC] font-medium uppercase tracking-wider">
                {CATEGORIES.find((c) => c.value === selectedCategory)?.label}
              </span>
            </div>
            <div className="hero-search">
              <SearchableSelect
                options={roleOptions}
                value={roleDropdownValue}
                onValueChange={setRoleDropdownValue}
                placeholder="Specialisering"
              />
            </div>
            <div className="hero-search">
              <SearchableSelect
                options={kommunOptions}
                value={selectedKommun}
                onValueChange={setSelectedKommun}
                placeholder="Kommun"
              />
            </div>
            <div>
              <div className="text-[10px] text-white/80 uppercase tracking-wider mb-1.5">Anställningsform</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setEmploymentType("anstalld")}
                  className={`min-h-[36px] rounded-lg px-2 py-1.5 text-[12px] font-medium transition-all border ${
                    employmentType === "anstalld"
                      ? "bg-white/15 border-[rgba(175,169,236,0.6)] text-white"
                      : "bg-white/[0.03] border-white/15 text-white/60 hover:bg-white/[0.08]"
                  }`}
                >
                  Anställd
                </button>
                <button
                  type="button"
                  onClick={() => setEmploymentType("foretagare")}
                  className={`min-h-[36px] rounded-lg px-2 py-1.5 text-[12px] font-medium transition-all border ${
                    employmentType === "foretagare"
                      ? "bg-white/15 border-[rgba(175,169,236,0.6)] text-white"
                      : "bg-white/[0.03] border-white/15 text-white/60 hover:bg-white/[0.08]"
                  }`}
                >
                  Egenföretagare
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Result card 1: Ramavtalspris ───────── */}
      <div className="bg-white/[0.07] border border-white/[0.13] rounded-[14px] px-5 py-4">
        <div className="text-[11px] text-white/70 uppercase tracking-wider mb-1 font-medium">
          RAMAVTALSPRIS · {showPlaceholder ? "—" : display.zon.toUpperCase()} · SKR 2026
        </div>
        <div className="text-[26px] font-medium text-white mb-0.5 tabular-nums">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin inline-block text-white/60" />
          ) : showPlaceholder ? (
            <span className="text-white/70 text-[18px]">Data ej tillgänglig</span>
          ) : (
            <>
              {fmt(animatedTimpris)}
              <span className="text-[16px] text-white/75"> kr/tim</span>
            </>
          )}
        </div>
        <div className="text-[12px] text-white/60 leading-snug">
          {showPlaceholder ? "Försök med ett annat val" : result ? `${display.roleName} i ${display.kommun}` : display.roleName}
        </div>
      </div>

      {/* ── Flow arrow ─────────────────────────── */}
      <div className="h-2 flex items-center justify-center relative -my-2">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/15" />
        <div className="w-[22px] h-[22px] rounded-full bg-white/[0.07] border border-white/15 flex items-center justify-center text-[10px] text-white/60 z-10 relative">↓</div>
      </div>

      {/* ── Result card 2: Marginal ────────────── */}
      <div className="bg-white/[0.07] border border-white/[0.13] rounded-[14px] px-5 py-4">
        <div className="text-[11px] text-white/70 uppercase tracking-wider mb-1 font-medium">BRANSCHENS GENOMSNITTSMARGINAL</div>
        <div className="text-[26px] font-medium text-white mb-0.5 tabular-nums">
          {showPlaceholder ? <span className="text-white/70 text-[18px]">—</span> : display.marginText}
        </div>
        {!showPlaceholder && (
          <span className="inline-block bg-amber-500/20 text-amber-200 text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded">
            −{fmt(display.marginKrMin)}–{fmt(display.marginKrMax)} kr/tim
          </span>
        )}
        <div className="text-[12px] text-white/60 leading-snug mt-1.5">Enligt offentliga avtal och branschdata</div>
      </div>

      <div className="h-2 flex items-center justify-center relative -my-2">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/15" />
        <div className="w-[22px] h-[22px] rounded-full bg-white/[0.07] border border-white/15 flex items-center justify-center text-[10px] text-white/60 z-10 relative">↓</div>
      </div>

      {/* ── Result card 3: Konsultlön (highlighted) ── */}
      <div className="bg-[rgba(83,74,183,0.25)] border-2 border-[rgba(175,169,236,0.4)] rounded-[14px] px-5 py-4">
        <div className="text-[11px] text-[rgba(195,189,255,0.95)] uppercase tracking-wider mb-1 font-medium">
          ESTIMERAD KONSULTERSÄTTNING
        </div>
        <div className="text-[30px] font-medium text-white mb-0.5 tabular-nums">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin inline-block text-white/60" />
          ) : showPlaceholder ? (
            <span className="text-white/70 text-[18px]">Data ej tillgänglig</span>
          ) : (
            <>
              {fmt(animatedHourly)}
              <span className="text-[16px] text-white/75"> kr/tim</span>
            </>
          )}
        </div>
        {!showPlaceholder && (
          <div className="text-[12px] text-[rgba(195,189,255,0.85)] leading-snug">
            {result
              ? `Spann ${fmt(display.hourlyMin)}–${fmt(display.hourlyMax)} kr/tim`
              : "Beräkna din ersättning ovan ↑"}
          </div>
        )}

        {/* Zone comparison row */}
        {!showPlaceholder && display.bestZon && display.bestZonDelta > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10 flex items-start gap-2">
            <span className="text-[#AFA9EC] text-[13px] leading-none mt-0.5">→</span>
            <div className="text-[11px] text-white/80 leading-snug">
              I <span className="font-semibold text-white">{display.bestZon}</span> kan samma roll ge{" "}
              <span className="font-semibold text-[#AFA9EC] tabular-nums">+{fmt(display.bestZonDelta)} kr/tim</span>
            </div>
          </div>
        )}

        {/* Inline email-capture CTA — primary conversion path */}
        {result && !showPlaceholder && (
          <div className="mt-4 pt-4 border-t border-white/15 space-y-2">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="din@email.se"
              className="w-full px-3 py-2.5 bg-white/10 border border-white/25 rounded-lg text-white text-[13px] placeholder:text-white/60 outline-none focus:border-white/50 transition-colors"
              onKeyDown={(e) => {
                if (e.key === "Enter" && emailValid && !submittingLead) handleSubmitLead();
              }}
            />
            <button
              type="button"
              onClick={handleSubmitLead}
              disabled={!emailValid || submittingLead}
              className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-medium transition-colors ${
                emailValid && !submittingLead
                  ? "bg-white text-[#1a1545] hover:bg-white/90"
                  : "bg-white/30 text-white/60 cursor-not-allowed"
              }`}
            >
              {submittingLead ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  Få fullständig analys som PDF
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
            {leadError && (
              <p className="text-[11px] text-amber-200 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {leadError}
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg px-3 py-2.5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-300 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-[12px] text-amber-100 leading-snug mb-1.5">{error}</p>
            <button
              type="button"
              onClick={() => setRetryNonce((n) => n + 1)}
              className="inline-flex items-center gap-1 text-[11px] text-white/90 hover:text-white font-medium"
            >
              <RefreshCw className="w-3 h-3" />
              Försök igen
            </button>
          </div>
        </div>
      )}

      {/* Style overrides for SearchableSelect inside dark hero */}
      <style>{`
        .hero-search [data-radix-popper-content-wrapper] { z-index: 100; }
        .hero-search button[role="combobox"],
        .hero-search button[aria-haspopup="listbox"] {
          background: rgba(255,255,255,0.05) !important;
          border-color: rgba(255,255,255,0.18) !important;
          color: rgba(255,255,255,0.95) !important;
          font-size: 12px !important;
          height: 36px !important;
        }
        .hero-search button[role="combobox"]:hover,
        .hero-search button[aria-haspopup="listbox"]:hover {
          background: rgba(255,255,255,0.10) !important;
          border-color: rgba(175,169,236,0.5) !important;
        }
        .hero-search [data-placeholder] { color: rgba(255,255,255,0.45) !important; }
      `}</style>
    </div>
  );
}
