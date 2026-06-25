import { Link } from "react-router-dom";
import InvoiceReviewCTA from "./InvoiceReviewCTA";
import PriceHistory from "./PriceHistory";
import PriceNuggets from "./PriceNuggets";
import type { PriceChange } from "@/shared/types";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Lock,
  ChevronDown,
  ArrowRight,
  BarChart3,
  Briefcase,
  MapPin,
  Info,
  CheckCircle,
  Clock,
  Car,
  Home,
  FileWarning,
  Handshake,
  LogIn,
} from "lucide-react";
import { fmt, formatPartialValue } from "@/shared/formatters";
import { SectionHeading, StatBlock, CalcRow } from "@/shared/UIComponents";
import type { ResultJson, ZoneComparison } from "@/shared/types";
import { getNegotiationTips } from "./negotiationData";
import ReportFeedback from "./ReportFeedback";
import EmployerCostBreakdown from "./EmployerCostBreakdown";

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

/** Section label */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <span
        className="uppercase whitespace-nowrap"
        style={{ fontFamily: 'sans-serif', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#3D3491' }}
      >
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

  // For employees, the comparable cost is gross salary × employer factor (1.38)
  const employerFactor = rec?.employee_factor ?? 1.38;
  const costToCompare = isEmployee ? Math.round(currentHourly * employerFactor) : currentHourly;
  const sharePercent = marketRate > 0 ? Math.round((costToCompare / marketRate) * 100) : 0;

  const monoClass = "font-[var(--font-mono)]";

  return (
    <div className="space-y-2.5">

      {/* ═══════════════════════════════════════════════════════════════
          2. SUMMARY CARD — Din lön vs Marknadsspann
          ═══════════════════════════════════════════════════════════════ */}
      {isConsultantFullAccess && rec && (
        <div id="flow-din-ersattning" ref={registerSectionRef?.("summary_card")} className="scroll-mt-24">
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

            {/* Progress bar between Din ersättning and Marknadsspann */}
            {rec.recommended_hourly_max > 1 && (
              <div className="px-3.5 py-3 border-t border-foreground/[0.05]">
                <div
                  className="w-full rounded-[3px]"
                  style={{ backgroundColor: '#E8E4F0', height: '6px' }}
                >
                  <div
                    className="h-full rounded-[3px]"
                    style={{
                      backgroundColor: '#3D3491',
                      width: `${Math.min(100, Math.max(1, (currentHourly / rec.recommended_hourly_max) * 100))}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2" style={{ fontSize: '12px', color: '#6B7280' }}>
                  <span>{fmt(currentHourly)} kr/h (din nivå)</span>
                  <span>{fmt(rec.recommended_hourly_max)} kr/h (möjlig ersättning)</span>
                </div>
              </div>
            )}

            {/* Möjlig ersättning row */}
            <div className="flex items-center justify-between p-3.5 border-t border-foreground/[0.05]">
              <div>
                <p className="text-micro font-semibold tracking-[0.8px] uppercase mb-1">Möjlig ersättning</p>
                <p className={`${monoClass} text-[22px] font-medium tracking-tight text-primary/[0.7]`}>{fmt(rec.recommended_hourly_min)}–{fmt(rec.recommended_hourly_max)} kr/h</p>
                <p className={`${monoClass} text-micro mt-0.5`}>{fmt(rec.recommended_monthly_min)}–{fmt(rec.recommended_monthly_max)} kr/mån</p>
              </div>
              <span className="text-micro font-semibold tracking-[0.5px] bg-primary/[0.08] text-primary/[0.8] border border-primary/[0.2] rounded-full px-2.5 py-1 whitespace-nowrap">
                Möjlig ersättning
              </span>
            </div>

          </div>
        </div>
      )}

      {/* Viktigt att veta — OB-policy & privat vårdgivare (tillhör Summary) */}
      {isConsultantFullAccess && rec && (
        <div className="rounded-xl border border-foreground/[0.07] bg-foreground/[0.02] p-3.5 space-y-2">
          <div className="flex items-start gap-2.5">
            <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-hint leading-relaxed">
              Analysen avser <span className="font-semibold text-foreground">grundersättning</span>. Eventuella OB-tillägg, jour- och beredskapsersättning tillkommer enligt gällande avtal.
            </p>
          </div>
        </div>
      )}

      {/* "Vad det här betyder för dig" — narrativ tolkning av Summary */}
      {isConsultantFullAccess && rec && !isAboveThreshold && (
        <div id="flow-situation" className="scroll-mt-24 relative rounded-2xl bg-gradient-to-b from-foreground/[0.06] to-foreground/[0.02] border border-foreground/10 p-6 overflow-hidden">
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
                Använd vår smarta assistent för mer information om hur du kan påverka din ersättning vid behov.
              </span>
            </li>
          </ul>
        </div>
      )}

      {/* Toppskiktet — för konsulter nära kundpris */}
      {isConsultantFullAccess && isAboveThreshold && (
        <div id="flow-situation" className="scroll-mt-24 relative rounded-2xl bg-gradient-to-b from-foreground/[0.06] to-foreground/[0.02] border border-foreground/10 p-6 overflow-hidden">
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


      {/* ═══════════════════════════════════════════════════════════════
          4. REGIONAL COMPARISON — Skapar kontext för lönen
          ═══════════════════════════════════════════════════════════════ */}
      {isConsultantFullAccess && zoneComparisons && zoneComparisons.length > 0 && (
        <div id="flow-regional" ref={registerSectionRef?.("regional_comparison")} className="scroll-mt-24 pt-4">
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
                  ? Math.round((zoneRate * shareMin) / 1.38)
                  : Math.round(zoneRate * shareMin);
                const recHourlyHigh = isEmployee
                  ? Math.round((zoneRate * shareMax) / 1.38)
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
                    {!isUserZone && (
                      <p className={`${monoClass} text-micro`}>
                        Konsultersättning: {fmt(recHourlyLow)}–{fmt(recHourlyHigh)} kr/h
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Section 5 (Förhandlingsspann) borttagen per produktbeslut. */}


      {/* ═══════════════════════════════════════════════════════════════
          6. MARKET INTELLIGENCE — Senaste avtalsändringar & noteringar
          ═══════════════════════════════════════════════════════════════ */}
      {isConsultantFullAccess && (
        <div id="flow-market" ref={registerSectionRef?.("market_intelligence")} className="scroll-mt-24 pt-6 space-y-3">
          <SectionLabel>Marknadsintelligens</SectionLabel>

          {/* 6a. Prishistorik (avtalsändringar) */}
          {priceHistory && priceHistory.length > 0 && (
            <PriceHistory
              changes={priceHistory}
              userZone={userZone}
              occupation={occupation}
            />
          )}

          {/* 6b. Avtalsändringar / Nuggets */}
          <PriceNuggets
            category={occupation?.toLowerCase().includes("läkare") ? "läkare" : "sjuksköterska"}
            zon={userZone}
            maxItems={3}
          />

          {/* 6c. Marknadsnoteringar */}
          {rec && (
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
          )}
        </div>
      )}

      {/* Feedback (placeras före metodologi) */}
      {leadId && (
        <ReportFeedback
          leadId={leadId}
          role={occupation}
          zone={userZone}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════
          7. FOOTER / METHODOLOGY — Hur vi räknar
          ═══════════════════════════════════════════════════════════════ */}
      {isConsultantFullAccess && rec && (
        <div id="flow-method" className="scroll-mt-24 pt-6 space-y-3">
          <SectionLabel>Metod & antaganden</SectionLabel>

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
                    label="÷ 1,38 (arbetsgivaravg. + pension + särskild löneskatt + AFA)"
                    value={`= ${fmt(Math.round(afterMarginMin / 1.38))}–${fmt(Math.round(afterMarginMax / 1.38))} kr/h brutto`}
                  />
                ) : (
                  <p className="text-hint pt-1">
                    Som egenföretagare bör du fakturera {Math.round(shareMin * 100)}–{Math.round(shareMax * 100)}% av kundpriset, dvs{" "}
                    {fmt(rec.recommended_hourly_min)}–{fmt(rec.recommended_hourly_max)} kr/h.
                  </p>
                )}
              </div>
              {isEmployee && rec && (
                <EmployerCostBreakdown
                  hourlySalary={currentHourly}
                  customerRate={marketRate}
                  marginShare={{ min: shareMin, max: shareMax }}
                  marginLabel={marginLabel}
                />
              )}
              <Separator className="opacity-20" />
              <div className="p-4 rounded-xl bg-foreground/[0.02] border border-border/30 space-y-3">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary shrink-0" />
                  <p className="font-semibold text-foreground text-sm">Information om beräkningen</p>
                </div>
                <ul className="space-y-2 text-hint leading-relaxed">
                  <li>
                    <span className="font-semibold text-foreground">Bemanningsbolagets marginal ({marginLabel}):</span>{" "}
                    Vi räknar med att bolaget behåller {marginLabel} av timpriset. {isEmployee ? "Detta är en vanlig nivå vid ramavtalsuppdrag." : `Spannet beror på om bemanningsföretaget bär vitesrisken (högre marginal) eller inte (lägre marginal).`} Marginalen kan i vissa fall vara lägre — t.ex. när bemanningsbolaget tar betalningsrisk, garanterar timmar eller bär kostnad för outnyttjad kapacitet.
                  </li>
                  {isEmployee && (
                    <li>
                      <span className="font-semibold text-foreground">Arbetsgivaravgifter & omkostnader (faktor 1,38):</span>{" "}
                      Täcker lagstadgade arbetsgivaravgifter (31,42 %), tjänstepension ITP 1 (4,5 % under brytpunkten), särskild löneskatt på pension (1,09 %) och AFA/TFA-försäkringar (0,85 %). Vi utgår från att bruttolönen ligger under brytpunkten 7,5 IBB (≈ 52 750 kr/mån). Över den nivån hoppar ITP 1 till 30 % och faktorn blir högre.
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

          {/* Så fungerar analysen */}
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
      )}

    </div>
  );
}
