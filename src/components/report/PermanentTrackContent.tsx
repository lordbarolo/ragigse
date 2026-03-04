import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Lock, ArrowRight, BarChart3 } from "lucide-react";
import { fmt, formatPartialValue } from "@/shared/formatters";
import { SectionHeading, StatBlock } from "@/shared/UIComponents";
import type { ResultJson } from "@/shared/types";
import ConsultantRateLookup from "./ConsultantRateLookup";

interface Props {
  r: ResultJson;
  isFullAccess: boolean;
  occupation: string;
  kommun: string;
}

export default function PermanentTrackContent({ r, isFullAccess, occupation, kommun }: Props) {
  const gap = r.gap_analysis;
  const benchMarket = r.market;
  const p75 = benchMarket?.percentile_75 ?? 0;

  return (
    <>
      {/* Benchmarkdata */}
      <Card className="card-shadow">
        <CardContent className="pt-6 space-y-4">
          <SectionHeading icon={BarChart3} title="Marknadsersättningar" />
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
                    : "Din ersättning ligger redan i toppskiktet!"}
                </p>
              </div>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <StatBlock label="Din nuvarande ersättning" value={`${fmt(gap.current_salary)} kr/mån`} muted />
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
                {/* Negotiation tips */}
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Förhandlingstips</p>
                  <ul className="space-y-2">
                    {[
                      `Referera till att medianersättningen för ${occupation} är ${fmt(benchMarket?.percentile_50 ?? 0)} kr/mån enligt Medlingsinstitutet.`,
                      gap.category === "large"
                        ? "Ditt gap mot marknaden är stort — du har goda skäl att kräva en rejäl ersättningsrevision."
                        : gap.category === "medium"
                        ? "Ditt gap mot marknaden är måttligt — begär en justering till minst mediannivå som start."
                        : "Din ersättning ligger nära marknaden — fokusera på förmåner och nästa steg i karriären.",
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
                  <StatBlock label="Din nuvarande ersättning" value={`${fmt(gap.current_salary)} kr/mån`} muted />
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

      {/* Konsultlöne-lookup */}
      <ConsultantRateLookup
        occupation={occupation}
        kommun={kommun}
        sector={r.inputs.sector}
      />
    </>
  );
}
