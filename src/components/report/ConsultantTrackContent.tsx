import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  Lock,
  ArrowRight,
  BarChart3,
  MessageSquareQuote,
  Building2,
  Briefcase,
  MapPin,
  Lightbulb,
  Info,
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
}

export default function ConsultantTrackContent({
  r,
  isFullAccess,
  isEmployee,
  occupation,
  kommun,
  zoneComparisons,
  userZone,
}: Props) {
  const marketRate = r.market?.rate_customer_sek_per_hour ?? 0;
  const rec = r.recommendation;
  const delta = r.delta;
  const isConsultantFullAccess = isFullAccess && !!rec;
  const margin = 0.15;
  const afterMargin = Math.round(marketRate * (1 - margin));

  const currentSalary = r.inputs.current_salary_sek;
  const salaryIsHourly = r.inputs.salary_type === "hourly";
  const currentHourly = salaryIsHourly ? currentSalary : (isEmployee ? Math.round(currentSalary / 167) : currentSalary);

  return (
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

      {/* Nästa steg — direkt efter mätaren för max impact */}
      {isConsultantFullAccess && rec && (
        <Card className="card-shadow border-primary/20">
          <CardContent className="pt-6 space-y-4">
            <SectionHeading icon={Lightbulb} title="Nästa steg — vad du ska säga" />
            <div className="space-y-4 text-sm text-muted-foreground">
              <ScriptBlock
                step={1}
                title="Boka möte"
                text="Kontakta din bemanningskonsult och begär ett ersättningssamtal. Nämn att du har gjort en marknadsanalys."
              />
              <ScriptBlock
                step={2}
                title="Presentera data"
                text={`"Jag har tagit fram ramavtalspriset för ${occupation} i min region. Kundpriset ligger på ${fmt(marketRate)} kr/h, och med 15% marginal borde min ${isEmployee ? 'bruttoersättning' : 'fakturering'} landa på ${fmt(rec.recommended_hourly_min)}–${fmt(rec.recommended_hourly_max)} kr/h."`}
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

      {/* 1. Ramavtalspris */}
      <Card className="card-shadow">
        <CardContent className="pt-6 space-y-3">
          <SectionHeading icon={BarChart3} title="Ramavtalspris" />
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Vad kunden betalar (ramavtal)</p>
            <p className="text-2xl font-bold text-foreground">{fmt(marketRate)} kr/h</p>
            <p className="text-xs text-muted-foreground mt-1">
              Grundtimpris enligt ramavtal (OB/jour ej inkluderat)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Rekommenderad ersättning */}
      <Card className="card-shadow overflow-hidden">
        {isConsultantFullAccess && rec ? (
          <>
            <div className="bg-accent/10 p-4 flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-accent" />
              <p className="font-semibold text-foreground">
                {delta && delta.monthly_vs_current_min > 0
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
                  <p className="text-xs text-muted-foreground mb-1">Skillnad mot din nuvarande ersättning</p>
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
              <p className="font-semibold text-foreground">Rekommenderad ersättning — låst</p>
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
              <CalcRow label="Bemanningsbolagets marginal (15%)" value={`−${fmt(Math.round(marketRate * margin))} kr/h`} />
              <CalcRow label="Ersättningsutrymme efter marginal" value={`${fmt(afterMargin)} kr/h`} />
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

      {/* 4. Förhandlingsrekommendationer (full) */}
      {isConsultantFullAccess && rec && (
        <Card className="card-shadow">
          <CardContent className="pt-6 space-y-4">
            <SectionHeading icon={MessageSquareQuote} title="Förhandlingsrekommendationer" />
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
      )}

      {/* 5. Regionala jämförelser (full) */}
      {isConsultantFullAccess && zoneComparisons && zoneComparisons.length > 0 && (
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
                    : Math.round(zoneRate * 0.85);
                  const recHourlyHigh = isEmployee
                    ? Math.round((zoneRate * 0.90) / 1.42)
                    : Math.round(zoneRate * 0.90);
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
                        Rekommenderad {isEmployee ? 'bruttoersättning' : 'ersättning'}: {fmt(recHourly)}–{fmt(recHourlyHigh)} kr/h
                      </p>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 7. Godkända leverantörer (full) */}
      {isConsultantFullAccess && (
        <Card className="card-shadow">
          <CardContent className="pt-6 space-y-4">
            <SectionHeading icon={Building2} title="Godkända leverantörer (ramavtal)" />
            <p className="text-sm text-muted-foreground">
              Bemanningsföretag med ramavtal för {occupation}:
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
  );
}
