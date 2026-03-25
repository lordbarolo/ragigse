import { Card, CardContent } from "@/components/ui/card";
import InvoiceReviewCTA from "./InvoiceReviewCTA";
import PersonalInsights from "./PersonalInsights";
import ColleagueComparison from "./ColleagueComparison";
import PriceHistory from "./PriceHistory";
import PriceNuggets from "./PriceNuggets";
import type { PriceChange } from "@/shared/types";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  TrendingUp,
  Lock,
  ChevronDown,
  ArrowRight,
  BarChart3,
  MessageSquareQuote,
  Building2,
  Briefcase,
  MapPin,
  Lightbulb,
  Info,
  CheckCircle,
  Clock,
  
  Copy,
  ShieldCheck,
} from "lucide-react";
import { fmt, formatPartialValue } from "@/shared/formatters";
import { SectionHeading, StatBlock, CalcRow } from "@/shared/UIComponents";
import type { ResultJson, ZoneComparison } from "@/shared/types";
import { getNegotiationTips, APPROVED_SUPPLIERS } from "./negotiationData";
import { toast } from "@/hooks/use-toast";
import ReportFeedback from "./ReportFeedback";

interface Props {
  r: ResultJson;
  isFullAccess: boolean;
  isEmployee: boolean;
  occupation: string;
  kommun: string;
  zoneComparisons?: ZoneComparison[];
  userZone?: string;
  registerSectionRef?: (section: string) => (el: HTMLDivElement | null) => void;
  leadId?: string;
  email?: string;
  reportId?: string;
  priceHistory?: PriceChange[];
}

/** Copyable script block with timeline styling */
function ScriptStep({ step, title, text }: { step: number; title: string; text: string }) {
  const isQuote = text.startsWith('"') || text.startsWith('\u201C');

  const handleCopy = () => {
    const cleanText = text.replace(/^[""\u201C]+|[""\u201D]+$/g, '');
    navigator.clipboard.writeText(cleanText);
    toast({ title: "Kopierat!" });
  };

  return (
    <div className="flex gap-4 relative">
      <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0 z-10">
        <span className="text-primary text-xs font-bold">{step}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm">{title}</p>
        {isQuote ? (
          <div className="bg-foreground/[0.04] rounded-lg p-3 mt-2 relative group">
            <p className="text-body-sm italic pr-8">{text}</p>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 opacity-60 hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
              aria-label="Kopiera"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <p className="text-body-sm mt-1">{text}</p>
        )}
      </div>
    </div>
  );
}

/** Section label */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <span className="text-micro font-semibold tracking-[1.4px] uppercase whitespace-nowrap">
        {children}
      </span>
    </div>
  );
}

export default function ConsultantTrackContent({
  r,
  isFullAccess,
  isEmployee,
  occupation,
  kommun,
  zoneComparisons,
  userZone,
  registerSectionRef,
  leadId,
  email,
  reportId,
  priceHistory,
}: Props) {
  const marketRate = r.market?.rate_customer_sek_per_hour ?? 0;
  const rec = r.recommendation;
  const delta = r.delta;
  const isConsultantFullAccess = isFullAccess && !!rec;

  const shareMin = rec?.consultant_share_min ?? (isEmployee ? 0.85 : 0.85);
  const shareMax = rec?.consultant_share_max ?? (isEmployee ? 0.90 : 0.92);
  const marginMin = Math.round((1 - shareMax) * 100);
  const marginMax = Math.round((1 - shareMin) * 100);
  const marginLabel = `${marginMin}–${marginMax}%`;
  const afterMarginMin = Math.round(marketRate * shareMin);
  const afterMarginMax = Math.round(marketRate * shareMax);

  const currentSalary = r.inputs.current_salary_sek;
  const salaryIsHourly = r.inputs.salary_type === "hourly";
  const currentHourly = salaryIsHourly ? currentSalary : (isEmployee ? Math.round(currentSalary / 167) : currentSalary);
  const currentMonthly = salaryIsHourly ? currentSalary * 167 : currentSalary;
  const recommendedMax = rec ? rec.recommended_hourly_max : Math.round(marketRate * shareMax);
  const isAboveThreshold = recommendedMax > 0 && currentHourly >= recommendedMax;

  // For employees, the comparable cost is gross salary × employer factor (1.42)
  const employerFactor = rec?.employee_factor ?? 1.42;
  const costToCompare = isEmployee ? Math.round(currentHourly * employerFactor) : currentHourly;
  const sharePercent = marketRate > 0 ? Math.round((costToCompare / marketRate) * 100) : 0;

  const monoClass = "font-[var(--font-mono)]";

  return (
    <div className="space-y-2.5">

      {/* ═══ 1. STATUS BADGE — Din position ═══ */}
      {isConsultantFullAccess && (
        <div className="px-0">
          {isAboveThreshold ? (
            <div className="flex items-start gap-3 rounded-[14px] p-3.5 bg-accent/[0.07] border border-accent/[0.18]">
              <div className="w-8 h-8 rounded-full bg-accent/[0.15] flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-accent" />
              </div>
              <div>
               <p className="text-sm font-semibold text-accent leading-snug mb-1">
                   Din ersättning ligger i marknadens övre skikt
                 </p>
                 <p className="text-hint leading-relaxed">
                   Ersättningen överstiger det beräknade marknadsspannet för din roll och zon.
                 </p>
              </div>
            </div>
          ) : delta && delta.monthly_vs_current_max > 0 ? (
            <div className="flex items-start gap-3 rounded-[14px] p-3.5 bg-accent/[0.07] border border-accent/[0.18]">
              <div className="w-8 h-8 rounded-full bg-accent/[0.15] flex items-center justify-center flex-shrink-0 mt-0.5">
                <TrendingUp className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-accent leading-snug mb-1">
                  Skillnad mot marknadsspannet: {fmt(delta.monthly_vs_current_max)} kr/mån
                </p>
                <p className="text-hint leading-relaxed">
                  Baserat på ramavtalspriset i din region.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-[14px] p-3.5 bg-accent/[0.07] border border-accent/[0.18]">
              <div className="w-8 h-8 rounded-full bg-accent/[0.15] flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-accent" />
              </div>
              <div>
                 <p className="text-sm font-semibold text-accent leading-snug mb-1">
                   Din ersättning ligger i linje med marknaden
                 </p>
                 <p className="text-hint leading-relaxed">
                   Ersättningen ligger inom det beräknade marknadsspannet. Se nedan för detaljer.
                 </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ 2. FÖRHANDLINGSSPANN ═══ */}
      {isConsultantFullAccess && rec ? (
        (() => {
          const realisticH = rec.recommended_hourly_min;
          const recommendedH = Math.round((rec.recommended_hourly_min + rec.recommended_hourly_max) / 2);
          const ambitiousH = Math.round(rec.recommended_hourly_max * 1.05);
          const hpm = rec.hours_per_month || 167;
          const realisticM = realisticH * hpm;
          const recommendedM = recommendedH * hpm;
          const ambitiousM = ambitiousH * hpm;

          // Calculate marker position on track
          const minH = realisticH;
          const maxH = ambitiousH;
          const range = maxH - minH;
          const fillPct = range > 0 ? Math.min(Math.round(((recommendedH - minH) / range) * 100), 100) : 50;
          const yourPct = range > 0 ? Math.min(Math.max(Math.round(((currentHourly - minH) / range) * 100), 0), 105) : 50;

          return (
            <div>
              <SectionLabel>Förhandlingsspann · {userZone || "Din zon"}</SectionLabel>
              <div className="grid grid-cols-3 gap-1.5">
                {/* Undre spann */}
                <div className="rounded-[14px] bg-foreground/[0.035] border border-foreground/[0.07] p-3 text-center">
                  <span className="text-micro font-bold tracking-[0.8px] uppercase block mb-1.5">Undre spann</span>
                  <span className={`${monoClass} text-[19px] font-medium text-foreground/[0.8] tracking-tight leading-none block mb-0.5`}>{fmt(realisticH)}</span>
                  <span className="text-micro block mb-1">kr/h</span>
                  <span className={`${monoClass} text-micro block`}>{fmt(realisticM)} kr/mån</span>
                </div>
                {/* Medianspann */}
                <div className="rounded-[14px] bg-primary/[0.08] border border-primary/[0.3] p-3 text-center">
                  <span className="text-micro font-bold tracking-[0.8px] uppercase text-primary block mb-1.5">Median</span>
                  <span className={`${monoClass} text-[19px] font-medium text-primary tracking-tight leading-none block mb-0.5`}>{fmt(recommendedH)}</span>
                  <span className="text-micro block mb-1">kr/h</span>
                  <span className={`${monoClass} text-micro text-primary/[0.5] block`}>{fmt(recommendedM)} kr/mån</span>
                </div>
                {/* Övre spann */}
                <div className="rounded-[14px] bg-foreground/[0.035] border border-foreground/[0.07] p-3 text-center">
                  <span className="text-micro font-bold tracking-[0.8px] uppercase block mb-1.5">Övre spann</span>
                  <span className={`${monoClass} text-[19px] font-medium text-foreground/[0.8] tracking-tight leading-none block mb-0.5`}>{fmt(ambitiousH)}</span>
                  <span className="text-micro block mb-1">kr/h</span>
                  <span className={`${monoClass} text-micro block`}>{fmt(ambitiousM)} kr/mån</span>
                </div>
              </div>


              <p className="text-micro text-center leading-relaxed pt-1.5">
                Baserat på ramavtalspris och branschens marginaler i {userZone || "din zon"}.
              </p>
            </div>
          );
        })()
      ) : !isConsultantFullAccess ? (
        <div className="rounded-2xl border border-border/50 overflow-hidden">
          <div className="bg-muted/50 p-4 flex items-center gap-3">
            <Lock className="w-5 h-5 text-muted-foreground" />
            <p className="font-semibold text-foreground">Marknadsspann — fullständig version</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <StatBlock label="Din timersättning" value={`${fmt(currentHourly)} kr`} muted />
              <div className="p-3 rounded-lg bg-accent/10 relative overflow-hidden">
                <p className="text-hint mb-1">Marknadsspann</p>
                <p className="text-base font-semibold text-accent blur-sm select-none">
                  {formatPartialValue(Math.round(marketRate * 0.6))} kr
                </p>
              </div>
            </div>
            <p className="text-body-sm text-center">
              Den fullständiga analysen med exakta siffror och regionala jämförelser finns i den utökade rapporten.
            </p>
          </div>
        </div>
      ) : null}

      {/* ═══ 3. ERSÄTTNINGSJÄMFÖRELSE ═══ */}
      {isConsultantFullAccess && rec && (
        <div>
          <SectionLabel>Ersättningsjämförelse</SectionLabel>
          <div className="rounded-[18px] bg-foreground/[0.035] border border-foreground/[0.07] overflow-hidden">
            {/* Din ersättning row */}
            <div className="flex items-center justify-between p-3.5 bg-accent/[0.04]">
              <div>
                <p className="text-micro font-semibold tracking-[0.8px] uppercase mb-1">{isEmployee ? "Din lön" : "Din ersättning"}</p>
                <p className={`${monoClass} text-[22px] font-bold tracking-tight text-foreground`}>{fmt(currentHourly)} kr/h</p>
                <p className={`${monoClass} text-micro mt-0.5`}>{fmt(currentMonthly)} kr/mån</p>
              </div>
              <span className="text-micro font-bold tracking-[0.5px] bg-accent/[0.18] text-accent border border-accent/[0.3] rounded-full px-2.5 py-1 whitespace-nowrap">
                Din nivå
              </span>
            </div>

            {/* Marknadsspann row */}
            <div className="flex items-center justify-between p-3.5 border-t border-foreground/[0.05]">
              <div>
                <p className="text-micro font-semibold tracking-[0.8px] uppercase mb-1">Marknadsspann</p>
                <p className={`${monoClass} text-[22px] font-medium tracking-tight text-primary/[0.7]`}>{fmt(rec.recommended_hourly_min)}–{fmt(rec.recommended_hourly_max)} kr/h</p>
                <p className={`${monoClass} text-micro mt-0.5`}>{fmt(rec.recommended_monthly_min)}–{fmt(rec.recommended_monthly_max)} kr/mån</p>
              </div>
              <span className="text-micro font-semibold tracking-[0.5px] bg-primary/[0.08] text-primary/[0.8] border border-primary/[0.2] rounded-full px-2.5 py-1 whitespace-nowrap">
                Marknad
              </span>
            </div>

            {/* Visual comparison bars */}
            <div className="px-4 pt-3 pb-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-foreground/60 shrink-0" />
                <div className="flex-1">
                  <p className="text-micro font-medium text-muted-foreground mb-1">Din ersättning</p>
                  <div className="h-[6px] bg-foreground/[0.06] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-foreground/60" style={{ width: `${Math.round((currentHourly / Math.max(currentHourly, rec.recommended_hourly_max, marketRate)) * 100)}%` }} />
                  </div>
                </div>
                <span className={`${monoClass} text-hint font-medium w-20 text-right flex-shrink-0`}>{fmt(currentHourly)} kr/h</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-micro font-medium text-primary/80 mb-1">Marknadsspann</p>
                  <div className="h-[6px] bg-foreground/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.round((rec.recommended_hourly_max / Math.max(currentHourly, rec.recommended_hourly_max, marketRate)) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className={`${monoClass} text-hint font-medium w-20 text-right flex-shrink-0`}>{fmt(rec.recommended_hourly_min)}–{fmt(rec.recommended_hourly_max)}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 shrink-0" />
                <div className="flex-1">
                  <p className="text-micro font-medium text-muted-foreground mb-1">Kundpris (regionen betalar)</p>
                  <div className="h-[6px] bg-foreground/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-muted-foreground/40"
                      style={{ width: `${Math.round((marketRate / Math.max(currentHourly, rec.recommended_hourly_max, marketRate)) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className={`${monoClass} text-hint font-medium w-20 text-right flex-shrink-0`}>{fmt(marketRate)} kr/h</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Sammanfattning av marknadsdata ═══ */}
      {isConsultantFullAccess && rec && !isAboveThreshold && (
        <div className="relative rounded-2xl bg-gradient-to-b from-foreground/[0.06] to-foreground/[0.02] border border-foreground/10 p-6 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">Vad det här betyder för dig</h2>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span className="text-body-sm leading-relaxed">
                Regionens ersättning till bemanningsföretag för {occupation} i {userZone || "din zon"} är {fmt(marketRate)} kr/h.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span className="text-body-sm leading-relaxed">
                Vanlig ersättning till konsult är {fmt(rec.recommended_hourly_min)}–{fmt(rec.recommended_hourly_max)} kr/h.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span className="text-body-sm leading-relaxed">
                Notera att resa, boende och kompetensintyg (t.ex. HLR, SITHS) ofta dras från ersättningen — fråga vad som ingår.
              </span>
            </li>
          </ul>
        </div>
      )}

      {/* Invoice Review CTA */}
      {isConsultantFullAccess && leadId && email && (
        <InvoiceReviewCTA
          leadId={leadId}
          email={email}
          role={occupation}
          zone={userZone}
          reportId={reportId}
        />
      )}

      {/* ═══ Feedback ═══ */}
      {leadId && (
        <ReportFeedback
          leadId={leadId}
          role={occupation}
          zone={userZone}
        />
      )}

      {/* ═══ 4. REGIONAL JÄMFÖRELSE ═══ */}
      {isConsultantFullAccess && zoneComparisons && zoneComparisons.length > 0 && (
        <div ref={registerSectionRef?.("regional_comparison")}>
          <SectionLabel>Regional jämförelse</SectionLabel>
          <p className="text-hint mb-3 leading-relaxed">
            Vad regionen betalar bemanningsföretag för {occupation} per zon:
          </p>
          <div className="space-y-1.5">
            {[...zoneComparisons]
              .sort((a, b) => a.zon.localeCompare(b.zon))
              .map((zc) => {
                const isUserZone = zc.zon === userZone;
                const zoneRate = zc.timpris_kund;
                const recHourlyLow = isEmployee
                  ? Math.round((zoneRate * shareMin) / 1.42)
                  : Math.round(zoneRate * shareMin);
                const recHourlyHigh = isEmployee
                  ? Math.round((zoneRate * shareMax) / 1.42)
                  : Math.round(zoneRate * shareMax);
                const maxRate = Math.max(...zoneComparisons.map((z) => z.timpris_kund));
                const barWidth = Math.round((zoneRate / maxRate) * 100);
                return (
                  <div
                    key={zc.zon}
                    className={`rounded-[14px] p-3 pb-2.5 ${
                      isUserZone
                        ? 'bg-primary/[0.07] border border-primary/[0.2]'
                        : 'bg-foreground/[0.03] border border-foreground/[0.06]'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-body-sm font-semibold">
                          {zc.zon}
                          <span className="text-micro font-normal text-muted-foreground ml-1">
                            {zc.zon === "Zon 1" && "– Närhet till större städer"}
                            {zc.zon === "Zon 2" && "– Mellanstora städer"}
                            {zc.zon === "Zon 3" && "– Glesbygd"}
                          </span>
                        </span>
                        {isUserZone && (
                          <span className="text-micro font-bold tracking-[0.6px] uppercase bg-primary/[0.15] text-primary rounded-[10px] px-2 py-0.5">
                            Din zon
                          </span>
                        )}
                      </div>
                      <span className={`${monoClass} text-[15px] font-medium ${isUserZone ? 'text-primary' : 'text-foreground/[0.6]'}`}>
                        {fmt(zoneRate)} kr/h
                      </span>
                    </div>
                    <div className="h-[3px] bg-foreground/[0.06] rounded-sm overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-sm ${isUserZone ? 'bg-primary' : 'bg-foreground/[0.15]'}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <p className={`${monoClass} text-micro`}>
                      Konsultersättning: {fmt(recHourlyLow)}–{fmt(recHourlyHigh)} kr/h
                    </p>
                  </div>
                );
              })}
          </div>
        </div>
      )}
      {/* ═══ 4b. PRISHISTORIK ═══ */}
      {isConsultantFullAccess && priceHistory && priceHistory.length > 0 && (
        <div ref={registerSectionRef?.("price_history")}>
          <PriceHistory
            changes={priceHistory}
            userZone={userZone}
            occupation={occupation}
          />
        </div>
      )}

      {/* ═══ 4c. AVTALSÄNDRINGAR (NUGGETS) ═══ */}
      {isConsultantFullAccess && (
        <div ref={registerSectionRef?.("price_nuggets")}>
          <PriceNuggets
            category={occupation?.toLowerCase().includes("läkare") ? "läkare" : "sjuksköterska"}
            maxItems={3}
          />
        </div>
      )}

      {/* "Din andel av kundpriset" section removed */}

      {/* ═══ Toppskiktet — för konsulter nära kundpris ═══ */}
      {isConsultantFullAccess && isAboveThreshold && (
        <div className="relative rounded-2xl bg-gradient-to-b from-foreground/[0.06] to-foreground/[0.02] border border-foreground/10 p-6 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Ersättningen ligger i marknadens övre skikt</h2>
          </div>
          <p className="text-body-sm leading-relaxed mb-5">
            Din ersättning på {fmt(currentHourly)} kr/h{isEmployee ? ` (lönekostnad ${fmt(costToCompare)} kr/h)` : ""} motsvarar {sharePercent}% av vad regionen betalar till bemanningsföretag ({fmt(marketRate)} kr/h).
          </p>
          <div className="space-y-2.5">
            <p className="text-caption">
              Övriga ersättningskomponenter i ramavtalet
            </p>
            {[
              { icon: MapPin, title: "Zonpriser", desc: "Ramavtalspriserna varierar per zon — se den regionala jämförelsen för samtliga zoner." },
              { icon: Clock, title: "Jourersättning", desc: "Jour- och beredskapstillägg regleras separat och ligger utanför grundtimpriset." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-3.5 rounded-xl bg-foreground/[0.03] border border-border/30">
                <Icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="text-hint mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Antaganden & Beräkning */}
      {isConsultantFullAccess && rec && (
        <Collapsible>
          <CollapsibleTrigger className="w-full flex items-center justify-between p-4 rounded-xl bg-foreground/[0.03] border border-border/30 hover:bg-foreground/[0.05] transition-colors">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Antaganden & Beräkning</span>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="space-y-3 text-body-sm">
              <CalcRow label="Ramavtalspris (vad regionen betalar)" value={`${fmt(marketRate)} kr/h`} />
              <CalcRow label={`Bemanningsbolagets marginal (${marginLabel})`} value={`−${fmt(Math.round(marketRate * (1 - shareMax)))}–${fmt(Math.round(marketRate * (1 - shareMin)))} kr/h`} />
              <CalcRow label="Ersättningsutrymme efter marginal" value={`${fmt(afterMarginMin)}–${fmt(afterMarginMax)} kr/h`} />
              {isEmployee ? (
                <CalcRow
                  label="÷ 1,42 (arbetsgivaravg. + semester + pension)"
                  value={`= ${fmt(Math.round(afterMarginMin / 1.42))}–${fmt(Math.round(afterMarginMax / 1.42))} kr/h brutto`}
                />
              ) : (
                <p className="text-hint pt-1">
                  Som egenföretagare bör du fakturera {Math.round(shareMin * 100)}–{Math.round(shareMax * 100)}% av kundpriset, dvs{" "}
                  {fmt(rec.recommended_hourly_min)}–{fmt(rec.recommended_hourly_max)} kr/h.
                </p>
              )}
            </div>
            <Separator className="opacity-20" />
            <div className="p-4 rounded-xl bg-foreground/[0.02] border border-border/30 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-primary shrink-0" />
                <p className="font-semibold text-foreground text-sm">Information om beräkningen</p>
              </div>
              <ul className="space-y-2 text-hint leading-relaxed">
                <li>
                  <span className="font-semibold text-foreground">Bemanningsbolagets marginal ({marginLabel}):</span>{" "}
                  Vi räknar med att bolaget behåller {marginLabel} av timpriset. {isEmployee ? "Detta är en vanlig nivå vid ramavtalsuppdrag." : `Spannet beror på om bemanningsföretaget bär vitesrisken (högre marginal) eller inte (lägre marginal).`}
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
              <p className="text-caption pt-1">
                {fmt(rec.recommended_hourly_min)}–{fmt(rec.recommended_hourly_max)} kr/h baseras på {marginLabel} marginal.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-foreground/[0.02] border border-border/30 space-y-2">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary shrink-0" />
                <p className="font-semibold text-foreground text-sm">Om marginalen överstiger {isEmployee ? "15%" : marginLabel}</p>
              </div>
              <p className="text-hint leading-relaxed">
                Vissa bemanningsföretag tar en högre marginal. En del av den kan gå till kostnader som i vissa fall ligger på bemanningsföretaget, t.ex. resa och boende, introduktionskostnad, SITHS-kort samt HLR-utbildning.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Marknadsnoteringar */}
      {isConsultantFullAccess && rec && (
        <div ref={registerSectionRef?.("negotiation_script")}>
          <div className="rounded-xl bg-foreground/[0.02] border border-border/30 p-5 space-y-4">
            <SectionHeading icon={BarChart3} title="Marknadsnoteringar" />
            <ul className="space-y-3">
              {getNegotiationTips(
                isEmployee,
                delta ? delta.monthly_vs_current_min > 0 : false,
                delta ? Math.round((delta.monthly_vs_current_max / rec.recommended_monthly_max) * 100) : 0,
                occupation
              ).map((tip, i) => (
                <li key={i} className="flex items-start gap-3">
                  <ArrowRight className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                  <span className="text-body-sm">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ═══ Personliga Insights ═══ */}
      {isConsultantFullAccess && rec && (
        <div ref={registerSectionRef?.("personal_insights")}>
          <PersonalInsights
            r={r}
            currentHourly={currentHourly}
            isEmployee={isEmployee}
            occupation={occupation}
            userZone={userZone}
            zoneComparisons={zoneComparisons}
          />
        </div>
      )}

      {/* ═══ Kollegajämförelse ═══ */}
      {isConsultantFullAccess && (
        <div ref={registerSectionRef?.("colleague_comparison")}>
          <ColleagueComparison
            occupation={occupation}
            percentilePosition={
              marketRate > 0 && currentHourly > 0
                ? (Math.round((currentHourly / marketRate) * 100) >= 90 ? 85
                  : Math.round((currentHourly / marketRate) * 100) >= 85 ? 70
                  : Math.round((currentHourly / marketRate) * 100) >= 75 ? 45
                  : Math.round((currentHourly / marketRate) * 100) >= 65 ? 25 : 10)
                : 0
            }
          />
        </div>
      )}

      {/* ═══ Förklarande text ═══ */}
      <div className="rounded-xl bg-foreground/[0.02] border border-border/30 p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Info className="w-4 h-4 text-foreground/60" />
          <span className="text-caption">Så fungerar analysen</span>
        </div>
        <ul className="space-y-2.5">
          {[
            "Regioner upphandlar bemanning genom ramavtal där ett kundpris fastställs.",
            "Bemanningsföretaget ansvarar för rekrytering, administration och risk i uppdraget.",
            "Konsultens ersättning är normalt en andel av detta pris.",
            "CompCare analyserar ramavtal och historiska uppdrag för att visa hur ersättningen i genomsnitt fördelas.",
          ].map((text, i) => (
            <li key={i} className="flex items-start gap-2.5 text-hint leading-relaxed">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/20 shrink-0" />
              {text}
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}
