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
} from "lucide-react";
import { fmt, formatPartialValue } from "@/shared/formatters";
import { SectionHeading, StatBlock, CalcRow, ScriptBlock } from "@/shared/UIComponents";
import type { ResultJson, ZoneComparison } from "@/shared/types";
import { getNegotiationTips, APPROVED_SUPPLIERS } from "./negotiationData";
import SalaryGauge from "@/components/SalaryGauge";

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
  const isDoctor = /läkare/i.test(occupation);
  const margin = isEmployee ? 0.15 : (isDoctor ? 0.10 : 0.14);
  const marginLabel = isEmployee ? "15%" : (isDoctor ? "10%" : "14%");
  const afterMargin = Math.round(marketRate * (1 - margin));

  const currentSalary = r.inputs.current_salary_sek;
  const salaryIsHourly = r.inputs.salary_type === "hourly";
  const currentHourly = salaryIsHourly ? currentSalary : (isEmployee ? Math.round(currentSalary / 167) : currentSalary);
  // Above threshold = user earns more than recommended max rate
  const recommendedMax = rec ? rec.recommended_hourly_max : Math.round(marketRate * (1 - margin));
  const isAboveThreshold = recommendedMax > 0 && currentHourly >= recommendedMax;

  return (
    <>
      {/* Salary Gauge */}
      <div className="rounded-xl bg-card/50 p-6">
        <SalaryGauge
          currentHourly={currentHourly}
          marketLow={rec ? rec.recommended_hourly_min : Math.round(marketRate * 0.6)}
          marketHigh={rec ? rec.recommended_hourly_max : Math.round(marketRate * 0.63)}
          blurred={!isConsultantFullAccess}
        />
      </div>

      {/* 1. Ramavtalspris — HERO CARD */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 p-6">
        {isConsultantFullAccess ? (
          <>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
              Vad regionen betalar till bemanningsföretag
            </p>
            <p className="text-5xl font-bold text-foreground">
              {fmt(marketRate)} <span className="text-2xl text-muted-foreground">kr/h</span>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Grundtimpris enligt ramavtal (OB/jour ej inkluderat)
            </p>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
              Vad regionen betalar till bemanningsföretag
            </p>
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <p className="text-4xl font-bold text-muted-foreground/30 select-none">■■■ kr/h</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Lås upp ramavtalspriset och se exakt vad regionen betalar för din roll.
            </p>
          </>
        )}
      </div>

      {/* Nästa steg — premium action card with timeline */}
      {isConsultantFullAccess && rec && !isAboveThreshold && (
        <div className="relative rounded-2xl bg-gradient-to-b from-card to-card/50 border border-border p-6 overflow-hidden">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Nästa steg — vad du ska säga</h2>
          </div>

          <div className="space-y-5 relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-primary/40 to-transparent" />

            <ScriptBlock
              step={1}
              title="Boka möte"
              text="Kontakta din bemanningskonsult och begär ett ersättningssamtal. Nämn att du har gjort en marknadsanalys."
            />
            <ScriptBlock
              step={2}
              title="Presentera data"
              text={`"Jag har tagit fram ramavtalspriset för ${occupation} i min region. Kundpriset ligger på ${fmt(marketRate)} kr/h, och därför borde min ersättning landa runt ${fmt(rec.recommended_hourly_max)} kr/h efter er marginal."`}
            />
            <ScriptBlock
              step={3}
              title="Ställ frågan"
              text={`"Jag vill att min ersättning justeras. Kan vi hitta en lösning?"`}
            />
            {isEmployee && (
              <ScriptBlock
                step={4}
                title="Bonus: fråga om pension"
                text={`"Ingår tjänstepension på minst 4.5% i min anställning? Det är standard i ramavtalet."`}
              />
            )}
          </div>
        </div>
      )}

      {/* Toppskiktet — anpassad info för konsulter nära kundpris */}
      {isConsultantFullAccess && isAboveThreshold && (
        <Card className="card-shadow border-primary/20">
          <CardContent className="pt-6 space-y-4">
            <SectionHeading icon={CheckCircle} title="Du ligger redan i toppskiktet" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Din ersättning på {fmt(currentHourly)} kr/h motsvarar 96% eller mer av vad kunden betalar ({fmt(marketRate)} kr/h). 
              Det innebär att det i praktiken inte finns ytterligare förhandlingsutrymme för grundtimpriset i din nuvarande zon.
            </p>
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Så kan du öka din totala ersättning
              </p>
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Byt till en högre priszon</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Se den regionala jämförelsen nedan — vissa zoner har betydligt högre ramavtalspriser för samma roll.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Jourersättning</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Jour- och beredskapstillägg ligger utanför grundtimpriset och kan ge ett betydande påslag på din totala ersättning. Förhandla specifika jourvillkor med ditt bemanningsföretag.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <Car className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Reseersättning</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Om uppdraget kräver resa finns ofta möjlighet att förhandla reseersättning, boende och traktamente utöver grundtimpriset.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* (Ramavtalspris is now the hero card above) */}

      {/* 2. Rekommenderad ersättning */}
      <Card className="card-shadow overflow-hidden">
        {isConsultantFullAccess && rec ? (
          <>
            <div className={`p-4 flex items-center gap-3 ${isAboveThreshold ? 'bg-primary/10' : 'bg-accent/10'}`}>
              {isAboveThreshold ? (
                <CheckCircle className="w-5 h-5 text-primary" />
              ) : (
                <TrendingUp className="w-5 h-5 text-accent" />
              )}
              <p className="font-semibold text-foreground">
                {isAboveThreshold
                  ? "Din ersättning är redan nära kundpriset — bra förhandlat!"
                  : delta && delta.monthly_vs_current_min > 0
                    ? `Du kan tjäna upp till ${fmt(delta.monthly_vs_current_max)} kr mer per månad`
                    : "Din ersättning ligger i linje med marknaden!"}
              </p>
            </div>
            <CardContent className="pt-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <StatBlock label="Din timersättning" value={`${fmt(currentHourly)} kr`} muted />
                <StatBlock
                  label={isEmployee ? "Rekommenderad timersättning" : "Rekommenderad ersättning"}
                  value={`${fmt(rec.recommended_hourly_min)}–${fmt(rec.recommended_hourly_max)} kr`}
                  accent
                />
                <StatBlock
                  label="Din månadsersättning"
                  value={`${fmt(salaryIsHourly ? currentSalary * 167 : currentSalary)} kr`}
                  muted
                />
                <StatBlock
                  label="Möjlig månadsersättning"
                  value={`${fmt(rec.recommended_monthly_min)}–${fmt(rec.recommended_monthly_max)} kr`}
                  accent
                />
              </div>

              {/* Förhandlingsspann */}
              <div className="p-4 rounded-lg bg-accent/5 border border-accent/20 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Förhandlingsspann</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="text-[10px] font-medium text-accent uppercase tracking-wide mb-1">Realistiskt</p>
                    <p className="text-base font-bold text-foreground">{fmt(rec.recommended_hourly_min)} kr/h</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{fmt(rec.recommended_monthly_min)} kr/mån</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 ring-2 ring-primary/30">
                    <p className="text-[10px] font-medium text-primary uppercase tracking-wide mb-1">Rekommenderat</p>
                    <p className="text-base font-bold text-foreground">
                      {fmt(Math.round((rec.recommended_hourly_min + rec.recommended_hourly_max) / 2))} kr/h
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {fmt(Math.round((rec.recommended_monthly_min + rec.recommended_monthly_max) / 2))} kr/mån
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-[10px] font-medium text-foreground uppercase tracking-wide mb-1">Ambitiöst</p>
                    <p className="text-base font-bold text-foreground">{fmt(rec.recommended_hourly_max)} kr/h</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{fmt(rec.recommended_monthly_max)} kr/mån</p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                  Realistiskt = hög chans att få igenom · Rekommenderat = vad vi föreslår · Ambitiöst = kräver stark erfarenhet
                </p>
              </div>

              {delta && delta.monthly_vs_current_min > 0 && (
                <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                  <p className="text-xs text-muted-foreground mb-1">Skillnad mot din nuvarande ersättning</p>
                  <p className="text-lg font-bold text-accent">
                    +{fmt(delta.monthly_vs_current_min)}–{fmt(delta.monthly_vs_current_max)} kr/mån
                  </p>
                </div>
              )}
            </CardContent>
          </>
        ) : (
          <>
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
          </>
        )}
      </Card>

      {/* 3. Antaganden & Beräkning (full) */}
      {isConsultantFullAccess && rec && (
        <Card className="card-shadow">
          <CardContent className="pt-6 space-y-4">
            <SectionHeading icon={Info} title="Antaganden & Beräkning" />
            <div className="space-y-3 text-sm text-muted-foreground">
              <CalcRow label="Ramavtalspris (vad kunden betalar)" value={`${fmt(marketRate)} kr/h`} />
              <CalcRow label={`Bemanningsbolagets marginal (${marginLabel})`} value={`−${fmt(Math.round(marketRate * margin))} kr/h`} />
              <CalcRow label="Ersättningsutrymme efter marginal" value={`${fmt(afterMargin)} kr/h`} />
              {isEmployee ? (
                <CalcRow
                  label="÷ 1,42 (arbetsgivaravg. + semester + pension)"
                  value={`= ${fmt(Math.round(afterMargin / 1.42))} kr/h brutto`}
                />
              ) : (
                <p className="text-xs text-muted-foreground/70 pt-1">
                  Som egenföretagare bör du fakturera {Math.round((1 - margin) * 100)}% av kundpriset, dvs{" "}
                  {fmt(rec.recommended_hourly_max)} kr/h.
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
                  <span className="font-semibold text-foreground">Bemanningsbolagets marginal ({marginLabel}):</span>{" "}
                  Vi räknar med att bolaget behåller {marginLabel} av timpriset. {isEmployee ? "Detta är en vanlig nivå vid ramavtalsuppdrag." : "Som egenföretagare är marknadsmässig marginal 14%."}
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
            <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary shrink-0" />
                <p className="font-semibold text-foreground text-sm">Om ditt bemanningsföretag behåller mer än {isEmployee ? "15%" : marginLabel}</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Vissa bemanningsföretag tar en högre marginal. En del av den kan gå till kostnader som i vissa fall ligger på bemanningsföretaget, t.ex. resa och boende, introduktionskostnad, SITHS-kort samt HLR-utbildning. Fråga ditt bemanningsföretag vilka kostnader som ingår i deras marginal — det ger dig bättre underlag i förhandlingen.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Förhandlingsrekommendationer (full) */}
      {isConsultantFullAccess && rec && (
        <div ref={registerSectionRef?.("negotiation_script")}>
        <Card className="card-shadow">
          <CardContent className="pt-6 space-y-4">
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
          </CardContent>
        </Card>
        </div>
      )}

      {/* Invoice Review CTA — after negotiation, before regional comparison */}
      {isConsultantFullAccess && leadId && email && (
        <InvoiceReviewCTA
          leadId={leadId}
          email={email}
          role={occupation}
          zone={userZone}
          reportId={reportId}
        />
      )}

      {/* 5. Regionala jämförelser (full) */}
      {isConsultantFullAccess && zoneComparisons && zoneComparisons.length > 0 && (
        <div ref={registerSectionRef?.("regional_comparison")}>
        <Card className="card-shadow">
          <CardContent className="pt-6 space-y-4">
            <SectionHeading icon={MapPin} title="Regional jämförelse" />
            <p className="text-sm text-muted-foreground">
              Vad kunden betalar för {occupation} i alla zoner:
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

      {/* 7. Godkända leverantörer — dold tillsvidare */}
    </>
  );
}
