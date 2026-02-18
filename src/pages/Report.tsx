import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  ShieldCheck,
  MapPin,
  Briefcase,
  ArrowRight,
  BarChart3,
  MessageSquareQuote,
  Building2,
  Lock,
  Loader2,
  Lightbulb,
  Info,
  Download,
  Linkedin,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import SalaryGauge from "@/components/SalaryGauge";
import ShareButton from "@/components/ShareButton";
import SocialProofBanner from "@/components/SocialProofBanner";

/* ── Types ────────────────────────────────────────────── */

interface ResultJson {
  calc_version: string;
  track?: "consultant" | "permanent";
  inputs: {
    location_id?: string;
    location?: string;
    occupation: string;
    employment_type: string;
    experience_years: number;
    current_salary_sek: number;
    salary_type?: string;
    sector?: string;
  };
  // Consultant track
  market?: {
    rate_customer_sek_per_hour?: number;
    // Permanent track market
    source?: string;
    year?: number;
    region?: string;
    percentile_25?: number;
    percentile_50?: number;
    percentile_75?: number;
    average_monthly?: number;
  };
  recommendation?: {
    consultant_share_min: number;
    consultant_share_max: number;
    employee_factor: number;
    recommended_hourly_min: number;
    recommended_hourly_max: number;
    recommended_monthly_min: number;
    recommended_monthly_max: number;
    hours_per_month: number;
  };
  delta?: {
    monthly_vs_current_min: number;
    monthly_vs_current_max: number;
  };
  // Permanent track
  gap_analysis?: {
    current_salary: number;
    gap_vs_p75: number;
    gap_pct: number | null;
    category: "small" | "medium" | "large" | null;
  };
}

interface ZoneComparison {
  yrkeskategori: string;
  zon: string;
  timpris_kund: number;
}

interface ReportData {
  id: string;
  status: string;
  access: "full" | "preview";
  occupation: string;
  employment_type: string;
  kommun: string;
  experience: number;
  unlocked_by_referral: boolean;
  email?: string;
  result_json: ResultJson;
  zone_comparisons?: ZoneComparison[];
  user_zone?: string;
}

/* ── Helpers ──────────────────────────────────────────── */

function fmt(v: number) {
  return v.toLocaleString("sv-SE");
}

function ensureNoTrailingZeros(value: number): number {
  const chars = String(value).split("");
  for (let i = Math.max(0, chars.length - 3); i < chars.length; i++) {
    if (chars[i] === "0") chars[i] = "1";
  }
  return parseInt(chars.join(""), 10);
}

function formatPartialValue(value: number): string {
  const adjusted = ensureNoTrailingZeros(value);
  const chars = String(adjusted).split("");
  if (chars.length > 1) chars[1] = "X";
  const result = chars.join("");
  if (result.length > 3) {
    return result.slice(0, -3) + " " + result.slice(-3);
  }
  return result;
}

/* ── Main component ───────────────────────────────────── */

export default function Report() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [consultantRate, setConsultantRate] = useState<number | null>(null);
  const [consultantLoading, setConsultantLoading] = useState(false);
  const [consultantExpanded, setConsultantExpanded] = useState(false);

  useEffect(() => {
    if (!reportId) {
      navigate("/");
      return;
    }

    const fetchReport = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-report", {
          body: { report_id: reportId },
        });
        if (error || !data || data.error) {
          navigate("/");
          return;
        }
        setReport(data as ReportData);
      } catch {
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId, navigate]);

  const handleCheckout = async (plan: "single" | "yearly") => {
    if (!report) return;
    setCheckoutLoading(plan);
    try {
      const leadId = sessionStorage.getItem("leadId");
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          plan,
          email: report.email || "",
          lead_id: leadId || "",
          report_id: report.id,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch {
      toast({ title: "Kunde inte starta betalning, försök igen", variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!report) return null;

  const r = report.result_json;
  const isPermanentTrack = r.track === "permanent";
  const isFullAccess = report.access === "full";
  const isEmployee = report.employment_type === "anstalld";

  // Consultant track values
  const marketRate = r.market?.rate_customer_sek_per_hour ?? 0;
  const rec = r.recommendation;
  const delta = r.delta;
  const isConsultantFullAccess = isFullAccess && !isPermanentTrack && !!rec;
  const margin = 0.15;
  const afterMargin = Math.round(marketRate * (1 - margin));

  // Permanent track values
  const gap = r.gap_analysis;
  const benchMarket = r.market;
  const p75 = benchMarket?.percentile_75 ?? 0;

  /* Shared preview values */
  const currentSalary = r.inputs.current_salary_sek;
  const salaryIsHourly = r.inputs.salary_type === "hourly";
  const currentHourly = salaryIsHourly ? currentSalary : (isEmployee ? Math.round(currentSalary / 167) : currentSalary);

  const handleLoadConsultantRate = async () => {
    if (!report.occupation || !report.kommun) return;
    setConsultantLoading(true);
    try {
      const { data: locData } = await supabase
        .from("locations")
        .select("zon")
        .eq("kommun", report.kommun)
        .limit(1);
      const zon = locData?.[0]?.zon || "Zon 1";

      // 1. Try exact match
      const { data: exactMatch } = await supabase
        .from("rates")
        .select("timpris_kund")
        .eq("yrkeskategori", report.occupation)
        .eq("zon", zon)
        .limit(1);

      if (exactMatch && exactMatch.length > 0) {
        setConsultantRate(exactMatch[0].timpris_kund);
        return;
      }

      // 2. Try prefix match (e.g. "Specialistläkare" → "Specialistläkare ortopedi")
      const { data: prefixMatch } = await supabase
        .from("rates")
        .select("timpris_kund")
        .ilike("yrkeskategori", `${report.occupation}%`)
        .eq("zon", zon)
        .limit(1);

      if (prefixMatch && prefixMatch.length > 0) {
        setConsultantRate(prefixMatch[0].timpris_kund);
        return;
      }

      // 3. Try same zon with any matching typ (fallback)
      const { data: anyMatch } = await supabase
        .from("rates")
        .select("typ")
        .ilike("yrkeskategori", `${report.occupation}%`)
        .limit(1);

      if (anyMatch && anyMatch.length > 0) {
        const { data: zoneRate } = await supabase
          .from("rates")
          .select("timpris_kund")
          .eq("typ", anyMatch[0].typ)
          .eq("zon", zon)
          .limit(1);
        if (zoneRate && zoneRate.length > 0) {
          setConsultantRate(zoneRate[0].timpris_kund);
          return;
        }
      }

      // Nothing found — inform user
      toast({ title: "Ingen konsultdata hittades för detta yrke", variant: "destructive" });
    } catch {
      toast({ title: "Kunde inte hämta konsultdata", variant: "destructive" });
    } finally {
      setConsultantLoading(false);
      setConsultantExpanded(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="hero-gradient py-10 px-5 text-center">
        <div className="max-w-2xl mx-auto space-y-2">
          <p className="text-xs uppercase tracking-widest text-primary-foreground/60">
            {isFullAccess ? "Din personliga rapport" : "Förhandsgranskning"}
          </p>
          <h1 className="text-2xl sm:text-3xl text-primary-foreground leading-tight">
            Löneanalys för {report.occupation}
          </h1>
          <p className="text-sm text-primary-foreground/80">
            {report.kommun} · {isPermanentTrack ? "Fast tjänst" : "Konsultuppdrag"}
          </p>
        </div>
      </header>

      <main className="px-4 py-8 max-w-2xl mx-auto space-y-6">
        {/* Referral banner */}
        {report.unlocked_by_referral && (
          <div className="flex items-center justify-center gap-2 py-2 px-4 bg-accent/10 border border-accent/20 rounded-lg text-xs text-accent font-medium">
            <ShieldCheck className="w-4 h-4" />
            Upplåst via kollegatips
          </div>
        )}

        {/* Social proof */}
        <SocialProofBanner occupation={report.occupation} />

        {/* ══════════════════════════════════════════════
            PERMANENT TRACK CONTENT
            ══════════════════════════════════════════════ */}
        {isPermanentTrack ? (
          <>
            {/* Benchmarkdata */}
            <Card className="card-shadow">
              <CardContent className="pt-6 space-y-4">
                <SectionHeading icon={BarChart3} title="Marknadslöner" />
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">P25</p>
                    <p className="text-base font-bold text-foreground">
                      {benchMarket?.percentile_25 ? `${fmt(benchMarket.percentile_25)} kr` : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">/månad</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 ring-2 ring-primary/30">
                    <p className="text-[10px] text-primary uppercase tracking-wide font-medium mb-1">Median</p>
                    <p className="text-base font-bold text-foreground">
                      {benchMarket?.percentile_50 ? `${fmt(benchMarket.percentile_50)} kr` : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">/månad</p>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="text-[10px] text-accent uppercase tracking-wide font-medium mb-1">P75</p>
                    <p className="text-base font-bold text-foreground">
                      {p75 ? `${fmt(p75)} kr` : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">/månad</p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                  Källa: {benchMarket?.source ?? "Medlingsinstitutet"} {benchMarket?.year ?? "2024"}
                  {benchMarket?.region ? ` · ${benchMarket.region}` : ""}
                </p>
              </CardContent>
            </Card>

            {/* Gap-analys */}
            {gap && (
              <Card className="card-shadow overflow-hidden">
                {isFullAccess ? (
                  <>
                    <div className={`p-4 flex items-center gap-3 ${gap.gap_vs_p75 > 0 ? "bg-accent/10" : "bg-green-500/10"}`}>
                      <TrendingUp className={`w-5 h-5 ${gap.gap_vs_p75 > 0 ? "text-accent" : "text-green-600"}`} />
                      <p className="font-semibold text-foreground">
                        {gap.gap_vs_p75 > 0
                          ? `Du kan tjäna upp till ${fmt(gap.gap_vs_p75)} kr mer per månad`
                          : "Din lön ligger redan i toppskiktet!"}
                      </p>
                    </div>
                    <CardContent className="pt-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <StatBlock label="Din nuvarande lön" value={`${fmt(gap.current_salary)} kr/mån`} muted />
                        <StatBlock label="Marknadens P75" value={`${fmt(p75)} kr/mån`} accent />
                      </div>
                      {gap.gap_vs_p75 > 0 && (
                        <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                          <p className="text-xs text-muted-foreground mb-1">Förhandlingsutrymme mot P75</p>
                          <p className="text-2xl font-bold text-accent">+{fmt(gap.gap_vs_p75)} kr/mån</p>
                          {gap.gap_pct !== null && (
                            <p className="text-xs text-muted-foreground mt-1">
                              ({gap.gap_pct}% under toppskiktet för din yrkesgrupp)
                            </p>
                          )}
                        </div>
                      )}
                      {/* Negotiation tips for permanent track */}
                      <div className="space-y-2 pt-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Förhandlingstips</p>
                        <ul className="space-y-2">
                          {[
                            `Referera till att medianlönen för ${report.occupation} är ${fmt(benchMarket?.percentile_50 ?? 0)} kr/mån enligt Medlingsinstitutet.`,
                            gap.category === "large"
                              ? "Ditt gap mot marknaden är stort — du har goda skäl att kräva en rejäl lönerevision."
                              : gap.category === "medium"
                              ? "Ditt gap mot marknaden är måttligt — begär en justering till minst mediannivå som start."
                              : "Din lön ligger nära marknaden — fokusera på förmåner och nästa steg i karriären.",
                            "Förbered dig med konkret statistik: 'Enligt SCB/MI ligger P75 för min yrkesgrupp på X kr.'",
                          ].map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <ArrowRight className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                              <span className="text-muted-foreground">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <>
                    <div className="bg-destructive/10 p-4 flex items-center gap-3">
                      <Lock className="w-5 h-5 text-destructive" />
                      <p className="font-semibold text-foreground">Din gap-analys — låst</p>
                    </div>
                    <CardContent className="pt-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <StatBlock label="Din nuvarande lön" value={`${fmt(gap.current_salary)} kr/mån`} muted />
                        <div className="p-3 rounded-lg bg-accent/10 relative overflow-hidden">
                          <p className="text-xs text-muted-foreground mb-1">Förhandlingsutrymme</p>
                          <p className="text-base font-semibold text-accent blur-sm select-none">
                            {formatPartialValue(gap.gap_vs_p75 > 0 ? gap.gap_vs_p75 : 500)} kr/mån
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        Lås upp för att se exakt förhandlingsutrymme, konkreta tips och din jämförelse mot marknaden.
                      </p>
                    </CardContent>
                  </>
                )}
              </Card>
            )}

            {/* ── Konsultlöne-fråga (permanent track) ─── */}
            <Card className="card-shadow border-primary/20">
              <CardContent className="pt-5 pb-5">
                <button
                  className="w-full flex items-center justify-between gap-3 text-left"
                  onClick={() => {
                    if (!consultantExpanded && consultantRate === null) {
                      handleLoadConsultantRate();
                    } else {
                      setConsultantExpanded((v) => !v);
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <HelpCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">Vad tjänar konsulter i samma roll?</p>
                      <p className="text-xs text-muted-foreground">Se vad en inhyrd kollega fakturerar per timme</p>
                    </div>
                  </div>
                  {consultantLoading ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                  ) : consultantExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>

                {consultantExpanded && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    {consultantRate !== null ? (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                            <p className="text-xs text-muted-foreground mb-1">Kundpris (ramavtal)</p>
                            <p className="text-lg font-bold text-foreground">{fmt(consultantRate)} kr/h</p>
                          </div>
                          <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                            <p className="text-xs text-muted-foreground mb-1">Konsultens andel (~85%)</p>
                            <p className="text-lg font-bold text-accent">{fmt(Math.round(consultantRate * 0.85))} kr/h</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              ≈ {fmt(Math.round(consultantRate * 0.85 * 167))} kr/mån
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          En {report.occupation} som arbetar via bemanningsföretag faktureras i {report.kommun}-regionen till {fmt(consultantRate)} kr/h mot kunden. Som konsult behåller du vanligtvis 85–90% av detta.
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          Källa: SKR/Kammarkollegiet ramavtal · {r.inputs.sector ? `Sektor: ${r.inputs.sector}` : ""}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        Ingen konsultdata hittades för denna roll i din region.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          /* ══════════════════════════════════════════════
             CONSULTANT TRACK CONTENT
             ══════════════════════════════════════════════ */
          <>
            {/* Salary Gauge */}
            <Card className="card-shadow">
              <CardContent className="pt-6 pb-4">
                <SalaryGauge
                  currentHourly={currentHourly}
                  marketLow={rec ? rec.recommended_hourly_min : Math.round(marketRate * 0.6)}
                  marketHigh={rec ? rec.recommended_hourly_max : Math.round(marketRate * 0.63)}
                  blurred={!isConsultantFullAccess}
                />
              </CardContent>
            </Card>

            {/* ── 1. Ramavtalspris ────────────────────── */}
            <Card className="card-shadow">
              <CardContent className="pt-6 space-y-3">
                <SectionHeading icon={BarChart3} title="Ramavtalspris" />
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">Timpris mot kund (ramavtal)</p>
                  <p className="text-2xl font-bold text-foreground">{fmt(marketRate)} kr/h</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Grundtimpris enligt ramavtal (OB/jour ej inkluderat)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* ── 2. Rekommenderad ersättning ─────────── */}
            <Card className="card-shadow overflow-hidden">
              {isConsultantFullAccess && rec ? (
                <>
                  <div className="bg-accent/10 p-4 flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-accent" />
                    <p className="font-semibold text-foreground">
                      {delta && delta.monthly_vs_current_min > 0
                        ? `Du kan tjäna upp till ${fmt(delta.monthly_vs_current_max)} kr mer per månad`
                        : "Din lön ligger i linje med marknaden!"}
                    </p>
                  </div>
                  <CardContent className="pt-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <StatBlock label="Din timlön" value={`${fmt(currentHourly)} kr`} muted />
                      <StatBlock
                        label={isEmployee ? "Rekommenderad timlön" : "Rekommenderad ersättning"}
                        value={`${fmt(rec.recommended_hourly_min)}–${fmt(rec.recommended_hourly_max)} kr`}
                        accent
                      />
                      <StatBlock
                        label="Din månadslön"
                        value={`${fmt(salaryIsHourly ? currentSalary * 167 : currentSalary)} kr`}
                        muted
                      />
                      <StatBlock
                        label="Möjlig månadslön"
                        value={`${fmt(rec.recommended_monthly_min)}–${fmt(rec.recommended_monthly_max)} kr`}
                        accent
                      />
                    </div>

                    {/* Förhandlingsspann */}
                    <div className="p-4 rounded-lg bg-accent/5 border border-accent/20 space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Förhandlingsspann</p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                          <p className="text-[10px] font-medium text-accent uppercase tracking-wide mb-1">Safe</p>
                          <p className="text-base font-bold text-foreground">{fmt(rec.recommended_hourly_min)} kr/h</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{fmt(rec.recommended_monthly_min)} kr/mån</p>
                        </div>
                        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 ring-2 ring-primary/30">
                          <p className="text-[10px] font-medium text-primary uppercase tracking-wide mb-1">Target</p>
                          <p className="text-base font-bold text-foreground">
                            {fmt(Math.round((rec.recommended_hourly_min + rec.recommended_hourly_max) / 2))} kr/h
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {fmt(Math.round((rec.recommended_monthly_min + rec.recommended_monthly_max) / 2))} kr/mån
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                          <p className="text-[10px] font-medium text-destructive uppercase tracking-wide mb-1">Aggressive</p>
                          <p className="text-base font-bold text-foreground">{fmt(rec.recommended_hourly_max)} kr/h</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{fmt(rec.recommended_monthly_max)} kr/mån</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground text-center">
                        Safe = hög chans att få igenom · Target = rekommenderat · Aggressive = kräver stark erfarenhet
                      </p>
                    </div>

                    {delta && delta.monthly_vs_current_min > 0 && (
                      <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                        <p className="text-xs text-muted-foreground mb-1">Skillnad mot din nuvarande lön</p>
                        <p className="text-lg font-bold text-destructive">
                          +{fmt(delta.monthly_vs_current_min)}–{fmt(delta.monthly_vs_current_max)} kr/mån
                        </p>
                      </div>
                    )}
                  </CardContent>
                </>
              ) : (
                <>
                  <div className="bg-destructive/10 p-4 flex items-center gap-3">
                    <Lock className="w-5 h-5 text-destructive" />
                    <p className="font-semibold text-foreground">Rekommenderad lön — låst</p>
                  </div>
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <StatBlock label="Din timlön" value={`${fmt(currentHourly)} kr`} muted />
                      <div className="p-3 rounded-lg bg-accent/10 relative overflow-hidden">
                        <p className="text-xs text-muted-foreground mb-1">Rekommenderad timlön</p>
                        <p className="text-base font-semibold text-accent blur-sm select-none">
                          {formatPartialValue(Math.round(marketRate * 0.6))} kr
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Lås upp den fullständiga analysen med exakta siffror, förhandlingsspann och personliga rekommendationer.
                    </p>
                  </CardContent>
                </>
              )}
            </Card>

            {/* ── 3. Antaganden & Beräkning (full) ─── */}
            {isConsultantFullAccess && rec && (
              <Card className="card-shadow">
                <CardContent className="pt-6 space-y-4">
                  <SectionHeading icon={Info} title="Antaganden & Beräkning" />
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <CalcRow label="Ramavtalspris (timpris mot kund)" value={`${fmt(marketRate)} kr/h`} />
                    <CalcRow label="Bemanningsbolagets marginal (15%)" value={`−${fmt(Math.round(marketRate * margin))} kr/h`} />
                    <CalcRow label="Löneutrymme efter marginal" value={`${fmt(afterMargin)} kr/h`} />
                    {isEmployee ? (
                      <CalcRow
                        label="÷ 1,42 (arbetsgivaravg. + semester + pension)"
                        value={`= ${fmt(Math.round(afterMargin / 1.42))} kr/h brutto`}
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground/70 pt-1">
                        Som egenföretagare bör du fakturera 85–90% av kundpriset, dvs{" "}
                        {fmt(rec.recommended_hourly_min)}–{fmt(rec.recommended_hourly_max)} kr/h.
                      </p>
                    )}
                  </div>
                  <Separator />
                  <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-primary shrink-0" />
                      <p className="font-semibold text-foreground text-sm">Information om beräkningen</p>
                    </div>
                    <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                      <li>
                        <span className="font-semibold text-foreground">Bemanningsbolagets marginal (15%):</span>{" "}
                        Vi räknar med att bolaget behåller 15% av timpriset. Detta är en vanlig nivå vid ramavtalsuppdrag.
                      </li>
                      {isEmployee && (
                        <li>
                          <span className="font-semibold text-foreground">Arbetsgivaravgifter & omkostnader (faktor 1,42):</span>{" "}
                          Täcker lagstadgade arbetsgivaravgifter (31,42%), tjänstepension, sjukförsäkring och semesterersättning.
                        </li>
                      )}
                      <li>
                        <span className="font-semibold text-foreground">Arbetsmånad:</span>{" "}
                        Vi baserar månadsberäkningen på ett snitt om 167 arbetstimmar.
                      </li>
                    </ul>
                    <p className="text-xs text-muted-foreground/70 pt-1">
                      Spannet {fmt(rec.recommended_hourly_min)}–{fmt(rec.recommended_hourly_max)} kr/h baseras på 10–15% marginal.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── 4. Förhandlingsrekommendationer (full) ── */}
            {isConsultantFullAccess && rec && (
              <Card className="card-shadow">
                <CardContent className="pt-6 space-y-4">
                  <SectionHeading icon={MessageSquareQuote} title="Förhandlingsrekommendationer" />
                  <ul className="space-y-3">
                    {getNegotiationTips(
                      isEmployee,
                      delta ? delta.monthly_vs_current_min > 0 : false,
                      delta ? Math.round((delta.monthly_vs_current_max / rec.recommended_monthly_max) * 100) : 0,
                      report.occupation
                    ).map((tip, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <ArrowRight className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* ── 5. Nästa steg — vad du ska säga (full) ── */}
            {isConsultantFullAccess && rec && (
              <Card className="card-shadow border-primary/20">
                <CardContent className="pt-6 space-y-4">
                  <SectionHeading icon={Lightbulb} title="Nästa steg — vad du ska säga" />
                  <div className="space-y-4 text-sm text-muted-foreground">
                    <ScriptBlock
                      step={1}
                      title="Boka möte"
                      text="Kontakta din bemanningskonsult och begär ett lönesamtal. Nämn att du har gjort en marknadsanalys."
                    />
                    <ScriptBlock
                      step={2}
                      title="Presentera data"
                      text={`"Jag har tagit fram ramavtalspriset för ${report.occupation} i min region. Kundpriset ligger på ${fmt(marketRate)} kr/h, och med 15% marginal borde min ${isEmployee ? 'bruttolön' : 'fakturering'} landa på ${fmt(rec.recommended_hourly_min)}–${fmt(rec.recommended_hourly_max)} kr/h."`}
                    />
                    <ScriptBlock
                      step={3}
                      title="Ställ frågan"
                      text={`"Jag vill att min ersättning justeras till minst ${fmt(rec.recommended_hourly_min)} kr/h. Kan vi hitta en lösning?"`}
                    />
                    {isEmployee && (
                      <ScriptBlock
                        step={4}
                        title="Bonus: fråga om pension"
                        text={`"Ingår tjänstepension på minst 4.5% i min anställning? Det är standard i ramavtalet."`}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── 6. Regionala jämförelser (full) ──────── */}
            {isConsultantFullAccess && report.zone_comparisons && report.zone_comparisons.length > 0 && (
              <Card className="card-shadow">
                <CardContent className="pt-6 space-y-4">
                  <SectionHeading icon={MapPin} title="Regional jämförelse" />
                  <p className="text-sm text-muted-foreground">
                    Timpris mot kund för {report.occupation} i alla zoner:
                  </p>
                  <div className="space-y-3">
                    {[...report.zone_comparisons]
                      .sort((a, b) => a.zon.localeCompare(b.zon))
                      .map((zc) => {
                        const isUserZone = zc.zon === report.user_zone;
                        const zoneRate = zc.timpris_kund;
                        const recHourly = isEmployee
                          ? Math.round((zoneRate * 0.85) / 1.42)
                          : Math.round(zoneRate * 0.85);
                        const recHourlyHigh = isEmployee
                          ? Math.round((zoneRate * 0.90) / 1.42)
                          : Math.round(zoneRate * 0.90);
                        const maxRate = Math.max(...report.zone_comparisons!.map((z) => z.timpris_kund));
                        const barWidth = Math.round((zoneRate / maxRate) * 100);
                        return (
                          <div key={zc.zon} className={`p-3 rounded-lg border ${isUserZone ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">{zc.zon}</span>
                                {isUserZone && (
                                  <span className="text-[10px] font-medium bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                                    Din zon
                                  </span>
                                )}
                              </div>
                              <span className="text-sm font-bold text-foreground">{fmt(zoneRate)} kr/h</span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden mb-1.5">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${isUserZone ? 'bg-primary' : 'bg-muted-foreground/40'}`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Rekommenderad {isEmployee ? 'bruttolön' : 'ersättning'}: {fmt(recHourly)}–{fmt(recHourlyHigh)} kr/h
                            </p>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── 7. Godkända leverantörer (full) ─────── */}
            {isConsultantFullAccess && (
              <Card className="card-shadow">
                <CardContent className="pt-6 space-y-4">
                  <SectionHeading icon={Building2} title="Godkända leverantörer (ramavtal)" />
                  <p className="text-sm text-muted-foreground">
                    Bemanningsföretag med ramavtal för {report.occupation}:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {APPROVED_SUPPLIERS.map((s) => (
                      <div key={s} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                        <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-foreground">{s}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ── CTA: Köpknappar (preview only) ─────── */}
        {!isFullAccess && (
          <div className="space-y-4">
            <Card className="card-shadow">
              <CardContent className="pt-6 space-y-3">
                <h3 className="font-display text-lg text-foreground">I din rapport får du:</h3>
                <ul className="space-y-2 text-sm">
                  {(isPermanentTrack
                    ? [
                        "Exakt förhandlingsutrymme mot marknadens P75",
                        "Konkreta förhandlingsargument anpassade för dig",
                        "Jämförelse mot medianen och toppskiktet",
                        "Se vad konsulter i samma roll tjänar",
                      ]
                    : [
                        "Exakt beräknad bruttolön baserat på ramavtal",
                        "Konkret förhandlingsspann med siffror",
                        "Steg-för-steg script: vad du ska säga",
                        "Lista på godkända leverantörer",
                      ]
                  ).map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <button
                data-cta
                disabled={checkoutLoading !== null}
                onClick={() => handleCheckout("single")}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-base hero-gradient text-primary-foreground card-shadow-hover transition-all disabled:opacity-70"
              >
                {checkoutLoading === "single" ? "Laddar..." : "Köp rapport — 49 kr"}
                {checkoutLoading !== "single" && <ArrowRight className="w-5 h-5" />}
              </button>
              <button
                data-cta
                disabled={checkoutLoading !== null}
                onClick={() => handleCheckout("yearly")}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-medium text-sm border-2 border-primary text-primary hover:bg-primary/5 transition-all disabled:opacity-70"
              >
                {checkoutLoading === "yearly" ? "Laddar..." : "Årsabonnemang — 495 kr/år"}
              </button>
              <p className="text-center text-xs text-muted-foreground">
                Engångsbetalning · Ingen bindningstid · Stripe säker betalning
              </p>
            </div>
          </div>
        )}

        {/* ── Action buttons (full access) ────── */}
        {isFullAccess && (
          <div className="flex flex-col gap-3">
            <ShareButton
              title="BraGig.se – Löneanalys"
              text={`Jag kollade min lön som ${report.occupation} med BraGig.se — rekommenderar det!`}
              className="w-full"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => window.print()}
              >
                <Download className="w-4 h-4" />
                PDF
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => {
                  const url = window.location.href;
                  const text = `Jag har precis tagit reda på mitt verkliga löneutrymme som ${report.occupation} med BraGig.se — rekommenderar det!`;
                  window.open(
                    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`,
                    "_blank",
                    "width=600,height=500"
                  );
                }}
              >
                <Linkedin className="w-4 h-4" />
                LinkedIn
              </Button>
            </div>
          </div>
        )}

        {/* ── Disclaimer ─────────────────────────── */}
        <Separator />
        <p className="text-xs text-muted-foreground text-center leading-relaxed pb-8">
          Denna rapport baseras på offentliga ramavtalspriser och är avsedd som vägledning.
          Faktisk lön kan variera beroende på arbetsgivare, uppdrag och individuella avtal.
          <br />
          © {new Date().getFullYear()} BraGig.se
        </p>
      </main>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────── */

function SectionHeading({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-5 h-5 text-primary" />
      <h2 className="font-display text-lg text-foreground">{title}</h2>
    </div>
  );
}

function StatBlock({
  label,
  value,
  muted,
  accent,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg ${accent ? "bg-accent/10" : "bg-muted/50"}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-base font-semibold ${accent ? "text-accent" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function CalcRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span className="font-medium text-foreground whitespace-nowrap">{value}</span>
    </div>
  );
}

function ScriptBlock({ step, title, text }: { step: number; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="text-xs font-bold text-primary">{step}</span>
      </div>
      <div>
        <p className="font-semibold text-foreground text-sm">{title}</p>
        <p className="mt-1 text-muted-foreground italic">{text}</p>
      </div>
    </div>
  );
}

/* ── Static data ──────────────────────────────────────── */

const APPROVED_SUPPLIERS = [
  "Dedicare",
  "Bemanning Sverige",
  "Medpeople",
  "Randstad Care",
  "Adecco Medical",
  "Manpower Care",
  "Uniflex",
  "Qualipharma",
];

function getNegotiationTips(
  isEmployee: boolean,
  isUnderpaid: boolean,
  diffPercent: number,
  yrke: string
): string[] {
  const tips: string[] = [];

  if (isUnderpaid) {
    tips.push(
      `Enligt ramavtalet bör din ersättning ligga ${diffPercent}% högre. Använd detta som utgångspunkt i förhandlingen.`
    );
    tips.push(
      "Begär ett möte med din bemanningskonsult och presentera ramavtalspriserna som referens."
    );
  } else {
    tips.push(
      "Din lön ligger redan nära marknadspris — bra förhandlat! Fokusera på andra förmåner."
    );
  }

  if (isEmployee) {
    tips.push(
      "Fråga om tjänstepensionen uppgår till minst 4.5% — det ingår i ramavtalets kalkyl."
    );
    tips.push(
      "Kontrollera att OB-tilläggen följer gällande kollektivavtal."
    );
    tips.push(
      "Förhandla om utbildningsbudget och kompetensutveckling."
    );
  } else {
    tips.push(
      "Som egenföretagare bör du fakturera minst 85% av kundpriset."
    );
    tips.push(
      "Förhandla betalningsvillkor — 15 dagars betaltid istället för 30 gör stor skillnad."
    );
  }

  tips.push(
    `Nämn att du är medveten om ramavtalspriserna för ${yrke} i din zon — det signalerar att du är insatt.`
  );

  return tips;
}
