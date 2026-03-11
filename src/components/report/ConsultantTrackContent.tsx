import { Card, CardContent } from "@/components/ui/card";
import InvoiceReviewCTA from "./InvoiceReviewCTA";
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
} from "lucide-react";
import { fmt, formatPartialValue } from "@/shared/formatters";
import { SectionHeading, StatBlock, CalcRow } from "@/shared/UIComponents";
import type { ResultJson, ZoneComparison } from "@/shared/types";
import { getNegotiationTips, APPROVED_SUPPLIERS } from "./negotiationData";
import SalaryGauge from "@/components/SalaryGauge";
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

  // Use share values from result_json (set by create-report based on employment type)
  const shareMin = rec?.consultant_share_min ?? (isEmployee ? 0.85 : 0.85);
  const shareMax = rec?.consultant_share_max ?? (isEmployee ? 0.90 : 0.92);
  const marginMin = Math.round((1 - shareMax) * 100); // e.g. 8%
  const marginMax = Math.round((1 - shareMin) * 100); // e.g. 15%
  const marginLabel = `${marginMin}–${marginMax}%`;
  const afterMarginMin = Math.round(marketRate * shareMin);
  const afterMarginMax = Math.round(marketRate * shareMax);

  const currentSalary = r.inputs.current_salary_sek;
  const salaryIsHourly = r.inputs.salary_type === "hourly";
  const currentHourly = salaryIsHourly ? currentSalary : (isEmployee ? Math.round(currentSalary / 167) : currentSalary);
  const recommendedMax = rec ? rec.recommended_hourly_max : Math.round(marketRate * shareMax);
  const isAboveThreshold = recommendedMax > 0 && currentHourly >= recommendedMax;

  return (
    <>
      {/* ═══ NIVÅ 1 — Hero: Ramavtalspris ═══ */}
      {isConsultantFullAccess ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 p-5 sm:p-6">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-2">
            Vad regionen betalar bemanningsföretaget
          </p>
          <p className="text-4xl sm:text-5xl font-bold text-foreground tabular-nums">
            {fmt(marketRate)} <span className="text-xl sm:text-2xl text-muted-foreground font-medium">kr/h</span>
          </p>
          <p className="text-muted-foreground/60 text-sm mt-2">
            Grundtimpris enligt ramavtal · OB/jour ej inkluderat
          </p>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-muted/50 border border-border p-5 sm:p-6">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">
            Vad regionen betalar till bemanningsföretag
          </p>
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-5 h-5 text-muted-foreground" />
            <p className="text-4xl font-bold text-muted-foreground/30 select-none">■■■ kr/h</p>
          </div>
          <p className="text-muted-foreground text-sm mt-2">
            Lås upp ramavtalspriset och se exakt vad regionen betalar för din roll.
          </p>
        </div>
      )}

      {/* Salary Gauge */}
      <div className="rounded-xl bg-foreground/[0.02] p-4 sm:p-5">
        <SalaryGauge
          currentHourly={currentHourly}
          marketLow={rec ? rec.recommended_hourly_min : Math.round(marketRate * 0.6)}
          marketHigh={rec ? rec.recommended_hourly_max : Math.round(marketRate * 0.63)}
          blurred={!isConsultantFullAccess}
        />
      </div>

      {/* ═══ NIVÅ 2 — Din position (borderless) ═══ */}
      {isConsultantFullAccess && rec ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            {isAboveThreshold ? (
              <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            ) : delta && delta.monthly_vs_current_min > 0 ? (
              <TrendingUp className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            )}
            <h3 className="text-base sm:text-lg font-semibold text-foreground leading-snug">
              {isAboveThreshold
                ? "Din ersättning är redan nära kundpriset — bra förhandlat!"
                : delta && delta.monthly_vs_current_max > 0
                  ? `Du kan tjäna upp till ${fmt(delta.monthly_vs_current_max)} kr mer per månad`
                  : "Din ersättning ligger i linje med marknaden!"}
            </h3>
          </div>

          {/* Stacked on mobile, 2-col on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-foreground/[0.03] rounded-xl p-4">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Din timersättning</p>
              <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{fmt(currentHourly)} kr</p>
            </div>
            <div className="bg-primary/[0.08] rounded-xl p-4 border border-primary/20">
              <p className="text-primary/70 text-xs uppercase tracking-wide">
                {isEmployee ? "Rekommenderad timersättning" : "Rekommenderad ersättning"}
              </p>
              <p className="text-2xl font-bold text-primary mt-1 tabular-nums">
                {fmt(rec.recommended_hourly_min)}–{fmt(rec.recommended_hourly_max)} kr
              </p>
            </div>
            <div className="bg-foreground/[0.03] rounded-xl p-4">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Din månadsersättning</p>
              <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                {fmt(salaryIsHourly ? currentSalary * 167 : currentSalary)} kr
              </p>
            </div>
            <div className="bg-primary/[0.08] rounded-xl p-4 border border-primary/20">
              <p className="text-primary/70 text-xs uppercase tracking-wide">Möjlig månadsersättning</p>
              <p className="text-2xl font-bold text-primary mt-1 tabular-nums">
                {fmt(rec.recommended_monthly_min)}–{fmt(rec.recommended_monthly_max)} kr
              </p>
            </div>
          </div>

          {delta && delta.monthly_vs_current_min > 0 && (
            <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
              <p className="text-xs text-muted-foreground mb-1">Skillnad mot din nuvarande ersättning</p>
              <p className="text-xl font-bold text-accent tabular-nums">
                +{fmt(delta.monthly_vs_current_min)}–{fmt(delta.monthly_vs_current_max)} kr/mån
              </p>
            </div>
          )}

          {/* Personal insight: share of customer price */}
          {marketRate > 0 && currentHourly > 0 && (
            <div className="p-4 rounded-xl bg-foreground/[0.03] border border-border">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-primary shrink-0" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Din andel av kundpriset</p>
              </div>
              <div className="flex items-end gap-3">
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  {Math.round((currentHourly / marketRate) * 100)}%
                </p>
                <p className="text-xs text-muted-foreground pb-1">
                  av {fmt(marketRate)} kr/h som regionen betalar
                </p>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden mt-3">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${Math.min(Math.round((currentHourly / marketRate) * 100), 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                {Math.round((currentHourly / marketRate) * 100) < 75
                  ? "Du får en ovanligt låg andel — det finns tydligt förhandlingsutrymme."
                  : Math.round((currentHourly / marketRate) * 100) < 85
                    ? "Vanligt spann, men det finns utrymme att förhandla upp."
                    : "Bra andel — du ligger nära marknadens övre gräns."}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Locked version */
        <Card className="card-shadow overflow-hidden">
          <div className="bg-muted/50 p-4 flex items-center gap-3">
            <Lock className="w-5 h-5 text-muted-foreground" />
            <p className="font-semibold text-foreground">Rekommenderad ersättning — lås upp</p>
          </div>
          <CardContent className="pt-6 space-y-4">
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
          </CardContent>
        </Card>
      )}

      {/* ═══ NIVÅ 3 — Förhandlingsspann (3 kolumner) ═══ */}
      {isConsultantFullAccess && rec && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Förhandlingsspann</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Realistiskt — low end of range */}
            <div className="p-3 rounded-lg bg-foreground/[0.03]">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Realistiskt</p>
              <p className="text-base font-bold text-foreground">{fmt(rec.recommended_hourly_min)} kr/h</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{fmt(rec.recommended_monthly_min)} kr/mån</p>
            </div>
            {/* Rekommenderat — midpoint */}
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 ring-2 ring-primary/20">
              <p className="text-[10px] font-medium text-primary uppercase tracking-wide mb-1">Rekommenderat</p>
              <p className="text-base font-bold text-foreground">
                {fmt(Math.round((rec.recommended_hourly_min + rec.recommended_hourly_max) / 2))} kr/h
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {fmt(Math.round((rec.recommended_monthly_min + rec.recommended_monthly_max) / 2))} kr/mån
              </p>
            </div>
            {/* Ambitiöst — high end + 5% stretch */}
            {(() => {
              const ambitiousHourly = Math.round(rec.recommended_hourly_max * 1.05);
              const ambitiousMonthly = ambitiousHourly * (rec.hours_per_month || 167);
              return (
                <div className="p-3 rounded-lg bg-foreground/[0.03]">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Ambitiöst</p>
                  <p className="text-base font-bold text-foreground">{fmt(ambitiousHourly)} kr/h</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{fmt(ambitiousMonthly)} kr/mån</p>
                </div>
              );
            })()}
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Realistiskt = hög chans att få igenom · Rekommenderat = vad vi föreslår · Ambitiöst = kräver stark erfarenhet
          </p>
        </div>
      )}

      {/* ═══ Nästa steg — Premium action card ═══ */}
      {isConsultantFullAccess && rec && !isAboveThreshold && (
        <div className="relative rounded-2xl bg-gradient-to-b from-foreground/[0.06] to-foreground/[0.02] border border-foreground/10 p-6 overflow-hidden">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Nästa steg — vad du ska säga</h2>
          </div>

          {/* Timeline */}
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

      {/* Toppskiktet — för konsulter nära kundpris */}
      {isConsultantFullAccess && isAboveThreshold && (
        <div className="relative rounded-2xl bg-gradient-to-b from-foreground/[0.06] to-foreground/[0.02] border border-foreground/10 p-6 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Du ligger redan i toppskiktet</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Din ersättning på {fmt(currentHourly)} kr/h motsvarar 96% eller mer av vad regionen betalar till bemanningsföretag ({fmt(marketRate)} kr/h). 
            Det innebär att det i praktiken inte finns ytterligare förhandlingsutrymme för grundtimpriset i din nuvarande zon.
          </p>
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Så kan du öka din totala ersättning
            </p>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-foreground/[0.04]">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Byt till en högre priszon</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Se den regionala jämförelsen nedan — vissa zoner har betydligt högre ramavtalspriser för samma roll.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-foreground/[0.04]">
              <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Jourersättning</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Jour- och beredskapstillägg ligger utanför grundtimpriset och kan ge ett betydande påslag på din totala ersättning.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-foreground/[0.04]">
              <Car className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Reseersättning</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Om uppdraget kräver resa finns ofta möjlighet att förhandla reseersättning, boende och traktamente utöver grundtimpriset.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Antaganden & Beräkning */}
      {isConsultantFullAccess && rec && (
        <Collapsible>
          <CollapsibleTrigger className="w-full flex items-center justify-between p-4 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.05] transition-colors">
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
                <p className="text-xs text-muted-foreground/70 pt-1">
                  Som egenföretagare bör du fakturera {Math.round(shareMin * 100)}–{Math.round(shareMax * 100)}% av kundpriset, dvs{" "}
                  {fmt(rec.recommended_hourly_min)}–{fmt(rec.recommended_hourly_max)} kr/h.
                </p>
              )}
            </div>
            <Separator />
            <div className="p-4 rounded-lg bg-foreground/[0.03] space-y-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-primary shrink-0" />
                <p className="font-semibold text-foreground text-sm">Information om beräkningen</p>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
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
              <p className="text-xs text-muted-foreground/70 pt-1">
                  {isEmployee
                    ? `Spannet ${fmt(rec.recommended_hourly_min)}–${fmt(rec.recommended_hourly_max)} kr/h baseras på 10–15% marginal.`
                    : `Ersättningen ${fmt(rec.recommended_hourly_max)} kr/h baseras på ${marginLabel} marginal.`}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-foreground/[0.03] space-y-2">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary shrink-0" />
                <p className="font-semibold text-foreground text-sm">Om ditt bemanningsföretag behåller mer än {isEmployee ? "15%" : marginLabel}</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Vissa bemanningsföretag tar en högre marginal. En del av den kan gå till kostnader som i vissa fall ligger på bemanningsföretaget, t.ex. resa och boende, introduktionskostnad, SITHS-kort samt HLR-utbildning. Fråga ditt bemanningsföretag vilka kostnader som ingår i deras marginal — det ger dig bättre underlag i förhandlingen.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Förhandlingstips */}
      {isConsultantFullAccess && rec && (
        <div ref={registerSectionRef?.("negotiation_script")}>
          <div className="rounded-xl bg-foreground/[0.03] p-5 space-y-4">
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

      {/* Regional jämförelse */}
      {isConsultantFullAccess && zoneComparisons && zoneComparisons.length > 0 && (
        <div ref={registerSectionRef?.("regional_comparison")}>
        <Card className="card-shadow">
          <CardContent className="pt-6 space-y-4">
            <SectionHeading icon={MapPin} title="Regional jämförelse" />
            <p className="text-sm text-muted-foreground">
              Vad regionen betalar till bemanningsföretag för {occupation} i alla zoner:
            </p>
            <div className="space-y-3">
              {[...zoneComparisons]
                .sort((a, b) => a.zon.localeCompare(b.zon))
                .map((zc) => {
                  const isUserZone = zc.zon === userZone;
                  const zoneRate = zc.timpris_kund;
                  const recHourly = isEmployee
                    ? Math.round((zoneRate * 0.85) / 1.42)
                    : Math.round(zoneRate * (1 - margin));
                  const recHourlyHigh = isEmployee
                    ? Math.round((zoneRate * 0.90) / 1.42)
                    : Math.round(zoneRate * (1 - margin));
                  const maxRate = Math.max(...zoneComparisons.map((z) => z.timpris_kund));
                  const barWidth = Math.round((zoneRate / maxRate) * 100);
                  return (
                    <div key={zc.zon} className={`p-3 rounded-lg border ${isUserZone ? 'border-primary bg-primary/5' : 'border-border bg-foreground/[0.03]'}`}>
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
                        Rekommenderad {isEmployee ? 'bruttoersättning' : 'ersättning'}: {isEmployee ? `${fmt(recHourly)}–${fmt(recHourlyHigh)}` : fmt(recHourlyHigh)} kr/h
                      </p>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
        </div>
      )}
    </>
  );
}
