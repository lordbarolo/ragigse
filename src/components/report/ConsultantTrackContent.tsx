import { Card, CardContent } from "@/components/ui/card";
import InvoiceReviewCTA from "./InvoiceReviewCTA";
import PersonalInsights from "./PersonalInsights";
import ColleagueComparison from "./ColleagueComparison";
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
  Car,
  Copy,
  ShieldCheck,
} from "lucide-react";
import { fmt, formatPartialValue } from "@/shared/formatters";
import { SectionHeading, StatBlock, CalcRow } from "@/shared/UIComponents";
import type { ResultJson, ZoneComparison } from "@/shared/types";
import { getNegotiationTips, APPROVED_SUPPLIERS } from "./negotiationData";
import { toast } from "@/hooks/use-toast";

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
            <p className="text-muted-foreground text-sm italic pr-8">{text}</p>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 opacity-60 hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
              aria-label="Kopiera"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <p className="mt-1 text-muted-foreground text-sm">{text}</p>
        )}
      </div>
    </div>
  );
}

/** Section label with trailing line */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="text-[10px] font-semibold tracking-[1.4px] uppercase text-foreground/[0.28] whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-foreground/[0.06]" />
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
                <p className="text-xs text-foreground/[0.45] leading-relaxed">
                  Du ligger redan över det rekommenderade spannet för din roll och zon. Fokus bör ligga på tillägg snarare än grundtimpriset.
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
                  Du kan tjäna upp till {fmt(delta.monthly_vs_current_max)} kr mer per månad
                </p>
                <p className="text-xs text-foreground/[0.45] leading-relaxed">
                  Baserat på ramavtalspriset i din region finns det utrymme att förhandla upp din ersättning.
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
                <p className="text-xs text-foreground/[0.45] leading-relaxed">
                  Du ligger nära den rekommenderade nivån. Se nedan för detaljer.
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
                {/* Realistiskt */}
                <div className="rounded-[14px] bg-foreground/[0.035] border border-foreground/[0.07] p-3 text-center">
                  <span className="text-[8px] font-bold tracking-[0.8px] uppercase text-foreground/[0.3] block mb-1.5">Realistiskt</span>
                  <span className={`${monoClass} text-[19px] font-medium text-foreground/[0.8] tracking-tight leading-none block mb-0.5`}>{fmt(realisticH)}</span>
                  <span className="text-[10px] text-foreground/[0.25] block mb-1">kr/h</span>
                  <span className={`${monoClass} text-[9px] text-foreground/[0.2] block`}>{fmt(realisticM)} kr/mån</span>
                </div>
                {/* Rekommenderat */}
                <div className="rounded-[14px] bg-primary/[0.08] border border-primary/[0.3] p-3 text-center">
                  <span className="text-[8px] font-bold tracking-[0.8px] uppercase text-primary block mb-1.5">Rekommenderat</span>
                  <span className={`${monoClass} text-[19px] font-medium text-primary tracking-tight leading-none block mb-0.5`}>{fmt(recommendedH)}</span>
                  <span className="text-[10px] text-foreground/[0.25] block mb-1">kr/h</span>
                  <span className={`${monoClass} text-[9px] text-primary/[0.5] block`}>{fmt(recommendedM)} kr/mån</span>
                </div>
                {/* Ambitiöst */}
                <div className="rounded-[14px] bg-foreground/[0.035] border border-foreground/[0.07] p-3 text-center">
                  <span className="text-[8px] font-bold tracking-[0.8px] uppercase text-foreground/[0.3] block mb-1.5">Ambitiöst</span>
                  <span className={`${monoClass} text-[19px] font-medium text-foreground/[0.8] tracking-tight leading-none block mb-0.5`}>{fmt(ambitiousH)}</span>
                  <span className="text-[10px] text-foreground/[0.25] block mb-1">kr/h</span>
                  <span className={`${monoClass} text-[9px] text-foreground/[0.2] block`}>{fmt(ambitiousM)} kr/mån</span>
                </div>
              </div>

              {/* Marker track */}
              <div className="pt-2.5 pb-1.5">
                <div className="relative h-0.5 bg-foreground/[0.07] rounded-full mx-1.5">
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary/40 to-primary/60 rounded-full"
                    style={{ width: `${fillPct}%` }}
                  />
                  {/* Your salary marker */}
                  <div
                    className="absolute flex flex-col items-center"
                    style={{ left: `${yourPct}%`, top: '-4px' }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-accent border-2 border-background shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    <span className="text-[8px] text-accent font-semibold whitespace-nowrap mt-1">Din lön · {fmt(currentHourly)}</span>
                  </div>
                </div>
              </div>

              <p className="text-[9px] text-foreground/[0.2] text-center leading-relaxed pt-1.5">
                Realistiskt = hög chans att få igenom · Rekommenderat = vad marknaden ger · Ambitiöst = kräver stark erfarenhet
              </p>
            </div>
          );
        })()
      ) : !isConsultantFullAccess ? (
        <div className="rounded-2xl border border-border/50 overflow-hidden">
          <div className="bg-muted/50 p-4 flex items-center gap-3">
            <Lock className="w-5 h-5 text-muted-foreground" />
            <p className="font-semibold text-foreground">Rekommenderad ersättning — lås upp</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <StatBlock label="Din timersättning" value={`${fmt(currentHourly)} kr`} muted />
              <div className="p-3 rounded-lg bg-accent/10 relative overflow-hidden">
                <p className="text-xs text-muted-foreground mb-1">Rekommenderad timersättning</p>
                <p className="text-base font-semibold text-accent blur-sm select-none">
                  {formatPartialValue(Math.round(marketRate * 0.6))} kr
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Lås upp den fullständiga analysen med exakta siffror, förhandlingsspann och personliga rekommendationer.
            </p>
          </div>
        </div>
      ) : null}

      {/* ═══ 3. ERSÄTTNINGSJÄMFÖRELSE ═══ */}
      {isConsultantFullAccess && rec && (
        <div>
          <SectionLabel>Ersättningsjämförelse</SectionLabel>
          <div className="rounded-[18px] bg-foreground/[0.035] border border-foreground/[0.07] overflow-hidden">
            {/* Din lön row */}
            <div className="flex items-center justify-between p-3.5 bg-accent/[0.04]">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.8px] uppercase text-foreground/[0.28] mb-1">Din lön</p>
                <p className={`${monoClass} text-[22px] font-medium tracking-tight text-accent`}>{fmt(currentHourly)} kr/h</p>
                <p className={`${monoClass} text-[10px] text-foreground/[0.2] mt-0.5`}>{fmt(currentMonthly)} kr/mån</p>
              </div>
              <span className="text-[9px] font-semibold tracking-[0.5px] bg-accent/[0.12] text-accent border border-accent/[0.2] rounded-full px-2.5 py-1 whitespace-nowrap">
                Din nivå
              </span>
            </div>

            {/* Marknadsspann row */}
            <div className="flex items-center justify-between p-3.5 border-t border-foreground/[0.05]">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.8px] uppercase text-foreground/[0.28] mb-1">Marknadsspann</p>
                <p className={`${monoClass} text-[22px] font-medium tracking-tight text-primary/[0.7]`}>{fmt(rec.recommended_hourly_min)}–{fmt(rec.recommended_hourly_max)} kr/h</p>
                <p className={`${monoClass} text-[10px] text-foreground/[0.2] mt-0.5`}>{fmt(rec.recommended_monthly_min)}–{fmt(rec.recommended_monthly_max)} kr/mån</p>
              </div>
              <span className="text-[9px] font-semibold tracking-[0.5px] bg-primary/[0.08] text-primary/[0.8] border border-primary/[0.2] rounded-full px-2.5 py-1 whitespace-nowrap">
                Marknad
              </span>
            </div>

            {/* Visual comparison bars */}
            <div className="px-4 pt-1 pb-3.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-[3px] bg-foreground/[0.05] rounded-sm overflow-hidden">
                  <div className="h-full rounded-sm bg-accent" style={{ width: '100%' }} />
                </div>
                <span className={`${monoClass} text-[9px] text-foreground/[0.2] w-16 text-right flex-shrink-0`}>{fmt(currentHourly)} kr/h</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-[3px] bg-foreground/[0.05] rounded-sm overflow-hidden">
                  <div
                    className="h-full rounded-sm bg-primary/50"
                    style={{ width: `${Math.round((rec.recommended_hourly_max / Math.max(currentHourly, rec.recommended_hourly_max, marketRate)) * 100)}%` }}
                  />
                </div>
                <span className={`${monoClass} text-[9px] text-foreground/[0.2] w-16 text-right flex-shrink-0`}>{fmt(rec.recommended_hourly_min)}–{fmt(rec.recommended_hourly_max)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-[3px] bg-foreground/[0.05] rounded-sm overflow-hidden">
                  <div
                    className="h-full rounded-sm bg-foreground/[0.15]"
                    style={{ width: `${Math.round((marketRate / Math.max(currentHourly, rec.recommended_hourly_max, marketRate)) * 100)}%` }}
                  />
                </div>
                <span className={`${monoClass} text-[9px] text-foreground/[0.2] w-16 text-right flex-shrink-0`}>{fmt(marketRate)} kr/h ↑</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Nästa steg ═══ */}
      {isConsultantFullAccess && rec && !isAboveThreshold && (
        <div className="relative rounded-2xl bg-gradient-to-b from-foreground/[0.06] to-foreground/[0.02] border border-foreground/10 p-6 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">Nästa steg — vad du ska säga</h2>
          </div>
          <div className="space-y-5 relative">
            <div className="absolute left-[15px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-primary/40 to-transparent" />
            <ScriptStep
              step={1}
              title="Boka möte"
              text="Kontakta din bemanningskonsult och begär ett ersättningssamtal. Nämn att du har gjort en marknadsanalys."
            />
            <ScriptStep
              step={2}
              title="Presentera data"
              text={`"Jag har tagit fram ramavtalspriset för ${occupation} i min region. Kundpriset ligger på ${fmt(marketRate)} kr/h, och därför borde min ersättning landa runt ${fmt(rec.recommended_hourly_max)} kr/h efter er marginal."`}
            />
            <ScriptStep
              step={3}
              title="Ställ frågan"
              text={`"Jag vill att min ersättning justeras. Kan vi hitta en lösning?"`}
            />
            {isEmployee && (
              <ScriptStep
                step={4}
                title="Bonus: fråga om pension"
                text={`"Ingår tjänstepension på minst 4.5% i min anställning? Det är standard i ramavtalet."`}
              />
            )}
          </div>
        </div>
      )}

      {/* ═══ 4. REGIONAL JÄMFÖRELSE ═══ */}
      {isConsultantFullAccess && zoneComparisons && zoneComparisons.length > 0 && (
        <div ref={registerSectionRef?.("regional_comparison")}>
          <SectionLabel>Regional jämförelse</SectionLabel>
          <p className="text-xs text-foreground/[0.35] mb-3 leading-relaxed">
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
                        <span className="text-[13px] font-semibold text-foreground/[0.7]">{zc.zon}</span>
                        {isUserZone && (
                          <span className="text-[8px] font-bold tracking-[0.6px] uppercase bg-primary/[0.15] text-primary rounded-[10px] px-2 py-0.5">
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
                    <p className={`${monoClass} text-[10px] text-foreground/[0.2]`}>
                      Konsultersättning: {fmt(recHourlyLow)}–{fmt(recHourlyHigh)} kr/h
                    </p>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ═══ 5. DIN ANDEL AV KUNDPRISET ═══ */}
      {isConsultantFullAccess && marketRate > 0 && currentHourly > 0 && (
        <div>
          <SectionLabel>Din andel av kundpriset</SectionLabel>
          <div className="rounded-[18px] bg-foreground/[0.035] border border-foreground/[0.07] p-4.5 px-4">
            <div className="flex justify-between items-start mb-3.5">
              <div>
                <span className={`${monoClass} text-[42px] font-medium text-accent tracking-tight leading-none block`}>
                  {Math.round((currentHourly / marketRate) * 100)}%
                </span>
                <span className="text-[11px] text-foreground/[0.3] mt-1 block">
                  av {fmt(marketRate)} kr/h som regionen betalar
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] tracking-[0.6px] uppercase text-foreground/[0.2] block mb-1">Marknadsmedian</span>
                <span className={`${monoClass} text-[11px] text-foreground/[0.4] block`}>90%</span>
                <span className="text-[9px] tracking-[0.6px] uppercase text-foreground/[0.2] block mt-1.5 mb-0.5">Vanligt spann</span>
                <span className={`${monoClass} text-[11px] text-foreground/[0.4] block`}>85–92%</span>
              </div>
            </div>

            {/* Gradient bar */}
            <div className="relative h-1.5 bg-foreground/[0.06] rounded overflow-visible mb-2.5">
              <div
                className="absolute left-0 top-0 h-full rounded bg-gradient-to-r from-primary/50 to-accent"
                style={{ width: `${Math.min(Math.round((currentHourly / marketRate) * 100), 100)}%` }}
              />
              <div
                className="absolute top-[-2px] w-px h-[10px] bg-foreground/[0.3]"
                style={{ left: `${Math.min(Math.round((currentHourly / marketRate) * 100), 100)}%` }}
              />
            </div>

            <p className="text-[11px] text-foreground/[0.3] leading-relaxed">
              {Math.round((currentHourly / marketRate) * 100) > 100 ? (
                <>
                  Över 100% är möjligt som egenföretagare — du fakturerar direkt utan mellanhand och bär då risker som annars ligger på bemanningsföretaget, t.ex. viten och administration.
                </>
              ) : Math.round((currentHourly / marketRate) * 100) >= 85 ? (
                <>
                  Bra andel — du ligger nära marknadens övre gräns. <strong className="text-foreground/50 font-medium">Vanligt spann: 85–92%</strong>.
                </>
              ) : (
                <>
                  Du får en relativt låg andel av kundpriset — det finns tydligt förhandlingsutrymme. <strong className="text-foreground/50 font-medium">Vanligt spann: 85–92%</strong>.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* ═══ Toppskiktet — för konsulter nära kundpris ═══ */}
      {isConsultantFullAccess && isAboveThreshold && (
        <div className="relative rounded-2xl bg-gradient-to-b from-foreground/[0.06] to-foreground/[0.02] border border-foreground/10 p-6 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Du ligger redan i toppskiktet</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            Din ersättning på {fmt(currentHourly)} kr/h motsvarar {Math.round((currentHourly / marketRate) * 100)}% av vad regionen betalar till bemanningsföretag ({fmt(marketRate)} kr/h).
            Det innebär att det i praktiken inte finns ytterligare förhandlingsutrymme för grundtimpriset i din nuvarande zon.
          </p>
          <div className="space-y-2.5">
            <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.15em]">
              Så kan du öka din totala ersättning
            </p>
            {[
              { icon: MapPin, title: "Byt till en högre priszon", desc: "Se den regionala jämförelsen — vissa zoner har betydligt högre ramavtalspriser för samma roll." },
              { icon: Clock, title: "Jourersättning", desc: "Jour- och beredskapstillägg ligger utanför grundtimpriset och kan ge ett betydande påslag." },
              { icon: Car, title: "Reseersättning", desc: "Om uppdraget kräver resa finns ofta möjlighet att förhandla reseersättning, boende och traktamente." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-3.5 rounded-xl bg-foreground/[0.03] border border-border/30">
                <Icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5 leading-relaxed">{desc}</p>
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
            <div className="space-y-3 text-sm text-muted-foreground">
              <CalcRow label="Ramavtalspris (vad regionen betalar)" value={`${fmt(marketRate)} kr/h`} />
              <CalcRow label={`Bemanningsbolagets marginal (${marginLabel})`} value={`−${fmt(Math.round(marketRate * (1 - shareMax)))}–${fmt(Math.round(marketRate * (1 - shareMin)))} kr/h`} />
              <CalcRow label="Ersättningsutrymme efter marginal" value={`${fmt(afterMarginMin)}–${fmt(afterMarginMax)} kr/h`} />
              {isEmployee ? (
                <CalcRow
                  label="÷ 1,42 (arbetsgivaravg. + semester + pension)"
                  value={`= ${fmt(Math.round(afterMarginMin / 1.42))}–${fmt(Math.round(afterMarginMax / 1.42))} kr/h brutto`}
                />
              ) : (
                <p className="text-xs text-muted-foreground/60 pt-1">
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
              <ul className="space-y-2 text-xs text-muted-foreground/70 leading-relaxed">
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
              <p className="text-[11px] text-muted-foreground/50 pt-1">
                {fmt(rec.recommended_hourly_min)}–{fmt(rec.recommended_hourly_max)} kr/h baseras på {marginLabel} marginal.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-foreground/[0.02] border border-border/30 space-y-2">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary shrink-0" />
                <p className="font-semibold text-foreground text-sm">Om ditt bemanningsföretag behåller mer än {isEmployee ? "15%" : marginLabel}</p>
              </div>
              <p className="text-xs text-muted-foreground/70 leading-relaxed">
                Vissa bemanningsföretag tar en högre marginal. En del av den kan gå till kostnader som i vissa fall ligger på bemanningsföretaget, t.ex. resa och boende, introduktionskostnad, SITHS-kort samt HLR-utbildning. Fråga ditt bemanningsföretag vilka kostnader som ingår i deras marginal — det ger dig bättre underlag i förhandlingen.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Förhandlingstips */}
      {isConsultantFullAccess && rec && (
        <div ref={registerSectionRef?.("negotiation_script")}>
          <div className="rounded-xl bg-foreground/[0.02] border border-border/30 p-5 space-y-4">
            <SectionHeading icon={MessageSquareQuote} title="Förhandlingstips" />
            <ul className="space-y-3">
              {getNegotiationTips(
                isEmployee,
                delta ? delta.monthly_vs_current_min > 0 : false,
                delta ? Math.round((delta.monthly_vs_current_max / rec.recommended_monthly_max) * 100) : 0,
                occupation
              ).map((tip, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <ArrowRight className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{tip}</span>
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
    </div>
  );
}
